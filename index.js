const
  cheerio = require('cheerio'),
  Request = require('request'),
  request = function(options) {
    return new Promise((resolve, reject) => {
      Request(options, function(error, response, body) {
        if (error)
          return reject(error)
        return resolve([response, body])
      })
    })
  }

module.exports = {
  /**
   * 登入 NCUE APP 服務
   * @name login
   * @method
   * @param {RequestJar} A jar
   * @param {String} user id
   * @param {String} user password
   * @returns {Boolean} 登入結果，true 或 false
   */
  login: function(jar, userid, password) {
    const options = {
      method: 'POST',
      url: 'http://aps.ncue.edu.tw/app/sess_student.php',
      headers: {
        'cache-control': 'no-cache',
        'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW'
      },
      formData: {
        p_usr: userid,
        p_pwd: password
      },
      jar: jar
    }

    return request(options)
      .then(([res, body]) => {
        if (body.search('成功') !== -1)
          return true;
        else if (body.search('錯誤') !== -1)
          return false
      }, (err) => null)
  },

  /**
   * 取得用戶歷年成績
   * @name getScore
   * @method
   * @param {RequestJar} 一個已經登入的jar
   * @returns {String} 回傳成績頁面
   */
  getScore: function(jar) {
    const options = {
      method: 'GET',
      url: 'http://aps.ncue.edu.tw/app/score.php',
      headers: {
        'cache-control': 'no-cache'
      },
      jar: jar
    }

    return request(options)
      .then(([res, body]) => body)
  },


  /**
   * 取得通識講座列表
   * @name getEvents
   * @method
   * @returns {Array.<{
   *   id: Number,
   *   name: String,
   *   href: String,
   *   date: Date,
   *   max: Number,
   *   cur: Number,
   *   status: String,
   *   signupUrl: (String | null),
   *   menberListUrl: (String | null)
   * }>}
   */
  getEvents: function() {
    const options = {
      method: 'GET',
      url: 'http://aps.ncue.edu.tw/app/signup.php?selpp=1',
      headers: {
        'cache-control': 'no-cache'
      }
    };

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
            date.setFullYear(date.getFullYear() + 1911);
            return {
              id: Number(children.find(':first-child > a').attr('href').match(/crs_seq=(\d*)/)[1]),
              name: children.find(':first-child > a').text(),
              href: children.find(':first-child > a').attr('href'),
              date: date,
              max: Number(children.eq(2).text()),
              cur: Number(children.eq(3).text()),
              status: children.eq(5).text(),
              signupUrl: children.find(':nth-child(6) > a').attr('href') || null,
              menberListUrl: children.find(':nth-child(4) > a').attr('href') || null,
            }
          })
        return data.get()
      })
  },

  /**
   * 報名活動
   * @name signupEvent
   * @method
   * @param {RequestJar} 一個已經登入的jar
   * @param {(String|Number)} 活動ID
   * @param {String} 用戶學號
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
        if (body.search('名額已滿') !== -1)
          throw new Error('名額已滿或報名已截止')
        else if (body.search('活動報名失敗') !== -1)
          throw new Error('活動報名失敗')
        else if (body.search('您已經報名本活動了') !== -1)
          throw new Error('已經報名本活動')
        return true
      })
  },

  /**
   * 取得活動報名清單
   * @name getSignedupEvents
   * @method
   * @param {RequestJar} 一個已經登入的jar
   * @returns {Array.<{
   *   id: Number,
   *   name: String,
   *   href: String,
   *   date: Date,
   *   max: Number,
   *   cur: Number,
   *   menberListUrl: (String | null)
   * }>}
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
            date.setFullYear(date.getFullYear() + 1911);
            return {
              id: Number(children.find(':first-child > a').attr('href').match(/crs_seq=(\d*)/)[1]),
              name: children.find(':first-child > a').text(),
              href: children.find(':first-child > a').attr('href'),
              date: date,
              max: Number(children.eq(2).text()),
              cur: Number(children.eq(3).text()),
              menberListUrl: children.find(':nth-child(4) > a').attr('href') || null,
            }
          })
        return data.get()
      })
  },

  /**
   * 取得報名編號
   * @name getSignSeq
   * @method
   * @param {RequestJar} 一個已經登入的jar
   * @param {(String|Number)} 活動ID
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
        if (match.length < 1)
          throw new Error('找不到報名編號')
        return Number(match[1])
      })
  },

  /**
   * 取消報名活動
   * @name cancelSignupEvent
   * @method
   * @param {RequestJar} 一個已經登入的jar
   * @param {(String|Number)} 報名編號
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
        if (body.search('已取消本筆活動報名資料') === -1)
          return false
        return true
      })
  },

  /**
   * 取消認證時數清單
   * @name getApprovedGeneralEduList
   * @method
   * @param {RequestJar} 一個已經登入的jar
   * @returns {Array.<{
   *   id: Number,
   *   name: String,
   *   href: String,
   *   date: Date,
   *   hours: Number
   * }>} 已認證的時數陣
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
            date.setFullYear(date.getFullYear() + 1911);
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
  },
}
