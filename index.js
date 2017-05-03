const
  // 用來剖析 html 的套件
  cheerio = require('cheerio'),
  // 請求網頁的套件
  Request = require('request'),
  // promise 化 request 函數
  request = function(options) {
    return new Promise((resolve, reject) => {
      Request(options, function(error, response, body) {
        if (error) {
          return reject(error)
        }
        return resolve([response, body])
      })
    })
  }

const api = {

  /**
   * Request 套件的 jar 物件。
   * @typedef {Object} RequestJar
   * @property {String} [userId] - 學號
   * @property {String} [password] - 密碼
   * @property {Boolean} [remember] - 是否記憶帳密
   * @property {Boolean} [autoRelogin] - 當伺服器端 session 過期，是否自動重新登入
   */

  /**
   * cookie jar，單純是 Request 套件 jar。
   * @name jar
   * @method
   * @returns {RequestJar} Request 套件 jar
   */
  jar: Request.jar,
  /**
   * 登入 NCUE APP 服務，
   * @name login
   * @method
   * @param {RequestJar} jar - 一個jar
   * @param {String} [userId] - 學號，若空值則使用記憶帳號
   * @param {String} [password] - 密碼，若空值則使用記憶密碼
   * @param {Object} [options] - 選項
   * @param {Boolean} [options.remember=false] - 是否記憶帳密
   * @param {Boolean} [options.autoRelogin=false] - 當伺服器端 session 過期，是否自動重新登入
   * @returns {Boolean} 登入結果，true 或 false
   */
  login: function(jar, userId, password, options = {}) {
    const remember = options.remember || false

    jar.autoRelogin = options.autoRelogin || jar.autoRelogin || false

    return request({
        method: 'POST',
        url: 'http://aps.ncue.edu.tw/app/sess_student.php',
        headers: {
          'cache-control': 'no-cache',
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW'
        },
        formData: {
          p_usr: userId || jar.userId,
          p_pwd: password || jar.password
        },
        jar: jar
      })
      .then(([res, body]) => {
        if (body.search('成功') !== -1) {
          if (remember) {
            jar.userId = userId
            jar.password = password
          } else {
            jar.userId = jar.password = void 0
          }

          return true
        } else if (body.search('錯誤') !== -1) {
          jar.userId = jar.password = void 0

          return false
        }
      })
  },
  /**
   * 登出 NCUE APP 服務，
   * @name logout
   * @method
   * @param {RequestJar} jar - 一個jar
   * @returns {Boolean} 登出結果，true 或 false
   */
  logout: function(jar) {
    return Promise.resolve(delete jar['_jar']['store']['idx']['aps.ncue.edu.tw']['/']['PHPSESSID'])
  },

  /**
   * 成績
   * @typedef {Object} Result
   * @property {String} name - 課程名稱
   * @property {Number} year - 學年度
   * @property {Number} semester - 學期
   * @property {Number} score - 學期分數
   * @property {Number} credit - 學分
   */

  /**
   * 取得用戶歷年成績
   * @name getResult
   * @method
   * @param {RequestJar} jar - 一個已經登入的jar
   * @returns {Result[]} 回傳成績陣列
   */
  getResult: function(jar) {
    return request({
        method: 'GET',
        url: 'http://aps.ncue.edu.tw/app/score.php',
        headers: {
          'cache-control': 'no-cache'
        },
        jar: jar
      })
      .then(([res, body]) => {
        if (body.search('請於首頁右上角之【設定】登入後使用') !== -1) {
          if (jar.autoRelogin && jar.remember && jar.userId && jar.password)
            return api.login(jar)
              .then((result) => (result) ?
                api.getResult(jar) :
                Promise.reject(new Error('無法登入')))
          else
            return Promise.reject(Error('尚未登入。'))
        }

        let
          currentYear,
          currentSemester

        const
          $ = cheerio.load(body, {
            ignoreWhitespace: true,
            xmlMode: false,
            decodeEntities: false
          }),
          rows = $('ul > li:not(:has(h2))')
          .filter((e) => e.data !== ' '),
          data = rows.map((i, row) => {
            row = $(row)
            if (row.has('h3,p,span').length !== 0) {
              return {
                name: row.find('h3').text(),
                year: currentYear,
                semester: currentSemester,
                score: Number(row.find('p').text().match(/分數：(\d*)/)[1]),
                credit: Number(row.find('span').text()),
              }
            } else {
              const temp = row.text().match(/\d+/g)
              currentYear = Number(temp[0])
              currentSemester = Number(temp[1])
              return void 0
            }
          })

        return data.get()
      })
  },

  /**
   * 課程
   * @typedef {Object} Course
   * @property {String} name - 課程名稱
   * @property {Number[]} periods - 上課節次陣列
   * @property {String} place - 上課教室
   * @property {Number} credit - 學分
   */

  /**
   * 取得用戶課表
   * @name getCurriculum
   * @method
   * @param {RequestJar} jar - 一個已經登入的jar
   * @returns {Course[]} 回傳課表
   */
  getCurriculum: function(jar) {
    return request({
        method: 'GET',
        url: 'http://aps.ncue.edu.tw/app/table.php',
        headers: {
          'cache-control': 'no-cache'
        },
        jar: jar
      })
      .then(([res, body]) => {
        if (body.search('請於首頁右上角之【設定】登入後使用') !== -1) {
          if (jar.autoRelogin && jar.remember && jar.userId && jar.password)
            return api.login(jar)
              .then((result) => (result) ?
                api.getCurriculum(jar) :
                Promise.reject(new Error('無法登入')))
          else
            return Promise.reject(Error('尚未登入。'))
        }


        const
          $ = cheerio.load(body, {
            ignoreWhitespace: true,
            xmlMode: false,
            decodeEntities: false
          }),
          rows = $('ul > li:has(h3,p,span)')
          .filter((e) => e.data !== ' '),
          data = rows.map((i, row) => {
            row = $(row)

            const periodMatched = row.find('p').text().match(/(?!上課節次：)(\d\d)-(\d\d)/) || []

            return {
              name: row.find('h3').text(),
              periods: Array.apply(null, {
                  length: Number(periodMatched[2]) - Number(periodMatched[1]) + 1
                })
                .map((e, i) => i + Number(periodMatched[1])),
              place: row.find('p').text().match(/上課教室：(.*)/)[1],
              credit: Number(row.find('span').text()),
            }
          })

        return data.get()
      })
  },

  /**
   * @typedef {Object} Event
   * @property {Number} id - 活動序號
   * @property {String} name - 活動名稱
   * @property {String} href - 活動網址
   * @property {Date} date - 活動日期
   * @property {Number} max - 人數上限
   * @property {Number} cur - 目前報名人數
   * @property {String} status - 活動狀態
   * @property {String|null} signupUrl - 報名網址
   * @property {String|null} menberListUrl - 成員名單網址
   */

  /**
   * 取得活動列表
   * @name getEvents
   * @method
   * @param {Stirng} [type=全部] - 活動種類：'全部', '通識', '心靈', '語文'
   * @returns {Event[]}
   */
  getEvents: function(type = '全部') {
    let selpp = 0

    if (type === '全部') {
      selpp = 0
    } else if (type === '通識') {
      selpp = 1
    } else if (type === '心靈') {
      selpp = 2
    } else if (type === '語文') {
      selpp = 4
    } else {
      console.warn('未知的種類，使用預設種類「全部」')
      selpp = 0
    }

    const options = {
      method: 'GET',
      url: 'http://aps.ncue.edu.tw/app/signup.php?selpp=' + selpp,
      headers: {
        'cache-control': 'no-cache'
      }
    }

    return request(options)
      .then(([res, body]) => {
        const
          $ = cheerio.load(body, {
            ignoreWhitespace: true,
            xmlMode: false,
            decodeEntities: false
          }),
          rows = $('#signup-table > tbody > tr')
          .filter((e) => e.data !== ' '),
          data = rows.map((i, row) => {
            const children = $(row).children()
              .filter((child) => child.data !== ' '),
              date = new Date(children.eq(1).text())
            date.setFullYear(date.getFullYear() + 1911)
            return {
              id: Number(children.find(':first-child > a').attr('href').match(/crs_seq=(\d*)/)[1]),
              name: children.find(':first-child > a').text(),
              href: 'http://aps.ncue.edu.tw/app/' + children.find(':first-child > a').attr('href'),
              date: date,
              max: Number(children.eq(2).text()),
              cur: Number(children.eq(3).text()),
              status: children.eq(5).text(),
              signupUrl: children.find(':nth-child(6) > a').attr('href') || null,
              menberListUrl: children.find(':nth-child(4) > a').attr('href') || null
            }
          })
        return data.get()
      })
  },

  /**
   * 取得活動資訊
   * @name getEvent
   * @method
   * @param {Number} eventId - 活動編號
   * @returns {Event2[]}
   */
  getEvent: function(eventId) {
    const options = {
      method: 'GET',
      url: 'http://aps.ncue.edu.tw/app/show_crs.php?crs_seq=' + eventId,
      headers: {
        'cache-control': 'no-cache'
      }
    }

    return request(options)
      .then(([res, body]) => {
        const
          $ = cheerio.load(body, {
            ignoreWhitespace: true,
            xmlMode: false,
            decodeEntities: false
          }),
          children = $('fieldset.ui-grid-a > div.ui-block-b > div > h1')
          .filter((e) => e.data !== ' '),
          date = new Date(children.eq(6).text()),
          signupUrl = $('div[data-role=content] > a:nth-child(3)').attr('href')
        date.setFullYear(date.getFullYear() + 1911)

        return {
          id: eventId,
          name: children.eq(0).text(),
          href: options.url,
          date: date,
          place: children.eq(4).text(),
          max: Number(children.eq(8).text()),
          status: $('div[data-role=content] > a:nth-child(3)').text(),
          signupUrl: (signupUrl !== 'signup.php') ? signupUrl : null,
          menberListUrl: 'http://aps.ncue.edu.tw/app/show_member.php?crs_seq=' + eventId,
          description: $('fieldset:not(.ui-grid-a) > div.txt').html().replace(/<(?:.|\n)*?>/gm, '\n')
        }
      })
  },

  /**
   * @typedef {Object} Member
   * @property {String} name - 姓名
   * @property {Number} gender - 性別，1 為男性，2 為女性。
   * @property {String} from - 服務單位
   * @property {String} job - 職稱
   */

  /**
   * 取得活動報名名單
   * @name getEventMember
   * @method
   * @param {Number} eventId - 活動編號
   * @returns {Member[]}
   */
  getEventMember: function(eventId) {
    const options = {
      method: 'GET',
      url: 'http://aps.ncue.edu.tw/app/show_member.php?crs_seq=' + eventId,
      headers: {
        'cache-control': 'no-cache'
      }
    }

    return request(options)
      .then(([res, body]) => {
        const
          $ = cheerio.load(body, {
            ignoreWhitespace: true,
            xmlMode: false,
            decodeEntities: false
          }),
          rows = $('#table-custom-2 > tbody > tr')
          .filter((e) => e.data !== ' '),
          data = rows.map((i, row) => {
            const children = $(row).children()
              .filter((child) => child.data !== ' ')
            return {
              name: children.eq(1).text(),
              gender: (children.eq(2).text() === '男') ? 1 : 2,
              from: children.eq(3).text(),
              job: children.eq(4).text()
            }
          })
        return data.get()
      })
  },

  /**
   * 報名活動
   * @name signupEvent
   * @method
   * @param {RequestJar} jar - 一個已經登入的jar
   * @param {(String|Number)} eventId - 活動ID
   * @param {String} userId - 用戶學號
   * @returns {Boolean} 報名成功與否
   */
  signupEvent: function(jar, eventId, userId) {
    const options = {
      method: 'POST',
      url: 'http://aps.ncue.edu.tw/app/sign_app_ok.php',
      headers: {
        'cache-control': 'no-cache'
      },
      jar: jar,
      formData: {
        stud_id: '',
        role: '2',
        crs_seq: eventId,
        person: 80,
        backpsn: 0,
        chkmeal: 0,
        proof_flg: 0,
        grp_cnt: 0,
        upload: 0,
        stud_name: 'NCUE-Plus 搶通識機器人',
        sex: 1,
        tel: '',
        email: userId.toLowerCase() + '@mail.ncue.edu.tw',
        addr: '',
        serv: 'NCUE-Plus 搶通識機器人',
        title: 'NCUE-Plus 搶通識機器人'
      }
    }

    return request(options)
      .then(([res, body]) => {
        if (body.search('名額已滿') !== -1) {
          throw new Error('名額已滿或報名已截止。')
        } else if (body.search('活動報名失敗') !== -1) {
          throw new Error('活動報名失敗。')
        } else if (body.search('您已經報名本活動了') !== -1) {
          throw new Error('已經報名本活動。')
        } else if (body.search('請於首頁右上角之【設定】登入後使用') !== -1) {
          if (jar.autoRelogin && jar.remember && jar.userId && jar.password)
            return api.login(jar)
              .then((result) => (result) ?
                api.getResult(jar) :
                Promise.reject(new Error('無法登入')))
          else
            return Promise.reject(Error('尚未登入。'))
        }

        return true
      })
  },

  /**
   * 取得活動報名清單
   * @name getSignedupEvents
   * @method
   * @param {RequestJar} jar - 一個已經登入的jar
   * @returns {{Array.<{
   *   id: Number,
   *   name: String,
   *   href: String,
   *   date: Date,
   *   max: Number,
   *   cur: Number,
   *   menberListUrl: (String | null)
   * }>}}
   */
  getSignedupEvents: function(jar) {
    return request({
        method: 'GET',
        url: 'http://aps.ncue.edu.tw/app/finish.php',
        headers: {
          'cache-control': 'no-cache'
        },
        jar: jar
      })
      .then(([res, body]) => {
        if (body.search('請於首頁右上角之【設定】登入後使用') !== -1) {
          if (jar.autoRelogin && jar.remember && jar.userId && jar.password)
            return api.login(jar)
              .then((result) => (result) ?
                api.getSignedupEvents(jar) :
                Promise.reject(new Error('無法登入')))
          else
            return Promise.reject(Error('尚未登入。'))
        }

        const
          $ = cheerio.load(body, {
            ignoreWhitespace: true,
            xmlMode: false,
            decodeEntities: false
          }),
          rows = $('#signup-table > tbody > tr:not(:last-child)')
          .filter((e) => e.data !== ' ')
        const
          data = rows.map((i, row) => {
            const children = $(row).children()
              .filter((child) => child.data !== ' '),
              date = new Date(children.eq(1).text())
            date.setFullYear(date.getFullYear() + 1911)
            return {
              id: Number(children.find(':first-child > a').attr('href').match(/crs_seq=(\d*)/)[1]),
              name: children.find(':first-child > a').text(),
              href: children.find(':first-child > a').attr('href'),
              date: date,
              max: Number(children.eq(2).text()),
              cur: Number(children.eq(3).text()),
              menberListUrl: children.find(':nth-child(4) > a').attr('href') || null
            }
          })
        return data.get()
      })
  },

  /**
   * 取得報名編號
   * @name getSignSeq
   * @method
   * @param {RequestJar} jar - 一個已經登入的jar
   * @param {(String|Number)} eventId - 活動ID
   * @returns {Number} 報名編號
   */
  getSignSeq: function(jar, eventId) {
    const options = {
      method: 'GET',
      url: 'http://aps.ncue.edu.tw/app/show_member.php?crs_seq=' + eventId,
      headers: {
        'cache-control': 'no-cache'
      },
      jar: jar
    }

    return request(options)
      .then(([res, body]) => {
        const match = body.match(/Del_check\('(\d*)'\)/)
        if (match.length < 1) {
          throw new Error('找不到報名編號，可能未報名該活動。')
        }
        return Number(match[1])
      })
  },

  /**
   * 取消報名活動
   * @name cancelSignupEvent
   * @method
   * @param {RequestJar} jar - 一個已經登入的jar
   * @param {(String|Number)} signSeq - 報名編號
   * @returns {Boolean} 是否成功取消報名
   */
  cancelSignupEvent: function(jar, signSeq) {
    const options = {
      method: 'GET',
      url: 'http://aps.ncue.edu.tw/app/del_signup.php?sign_seq=' + signSeq,
      headers: {
        'cache-control': 'no-cache'
      },
      jar: jar
    }

    return request(options)
      .then(([res, body]) => {
        if (body.search('請於首頁右上角之【設定】登入後使用') !== -1) {
          if (jar.autoRelogin && jar.remember && jar.userId && jar.password) {
            return api.login(jar)
              .then((result) => (result) ?
                api.cancelSignupEvent(jar, signSeq) :
                Promise.reject(new Error('無法登入')))
          } else {
            throw new Error('尚未登入。')
          }
        }

        if (body.search('已取消本筆活動報名資料') === -1) {
          return false
        }
        return true
      })
  },

  /**
   * @typedef {Object} ApprovedGeneralEdu
   * @property {Number} id - 活動序號
   * @property {String} name - 活動名稱
   * @property {String} href - 活動網址
   * @property {Date} date - 活動日期
   * @property {Number} hours - 十數
   */

  /**
   * 取消認證時數清單
   * @name getApprovedGeneralEduList
   * @method
   * @param {RequestJar} jar - 一個已經登入的jar
   * @returns {ApprovedGeneralEdu[]}
   */
  getApprovedGeneralEduList: function(jar) {
    const options = {
      method: 'GET',
      url: 'http://aps.ncue.edu.tw/app/hour.php',
      headers: {
        'cache-control': 'no-cache'
      },
      jar: jar
    }

    return request(options)
      .then(([res, body]) => {
        if (body.search('請於首頁右上角之【設定】登入後使用') !== -1) {
          if (jar.autoRelogin && jar.remember && jar.userId && jar.password) {
            return api.login(jar)
              .then((result) => (result) ?
                api.getApprovedGeneralEduList(jar) :
                Promise.reject(new Error('無法登入')))
          } else {
            throw new Error('尚未登入。')
          }
        }

        const
          $ = cheerio.load(body, {
            ignoreWhitespace: true,
            xmlMode: false,
            decodeEntities: false
          }),
          rows = $('ul[data-role=listview] > li > a')
        const
          data = rows.map((i, row) => {
            const
              a = $(row),
              children = a.children(),
              date = new Date(children.eq(1).text().match(/\d*\/\d*\/\d*/))
            date.setFullYear(date.getFullYear() + 1911)
            return {
              id: Number(a.attr('href').match(/crs_seq=(\d*)/)[1]),
              name: children.eq(0).text(),
              href: a.attr('href'),
              date: date,
              hours: Number(children.eq(2).text())
            }
          })
        return data.get()
      })
  }
}

module.exports = api
