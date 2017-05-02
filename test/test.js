const
  api = require('../index.js'),
  conf = require('./test-config.json'),
  assert = require('assert'),
  jar = api.jar()

describe('登入', function () {
  it('should 回傳 true 當登入成功', function (done) {
    api.login(jar, conf.user.id, conf.user.password, {
      remember: true
    })
      .then((result) => assert.strictEqual(result, true))
      .then(done, done)
  })

  it('should 回傳 true 當登出成功', function (done) {
    api.logout(jar)
      .then((result) => assert.strictEqual(result, true))
      .then(done, done)
  })

  it('should 回傳 true 當使用記憶帳密登入成功', function (done) {
    api.login(jar)
      .then((result) => assert.strictEqual(result, true))
      .then(done, done)
  })

  // it('should 回傳 false 當密碼錯誤的時候', function(done) {
  //   this.timeout(10000);
  //   api.login(jar, conf.user.id, 'foobar')
  //     .then((result) => assert.strictEqual(result, false))
  //     .then(done, done)
  // })
})

describe('線上報名系統', function () {
  let
    targetEventId,
    originSignedupEvents = []

  it('should 回傳活動列表陣列', function (done) {
    api.getEvents()
      .then((events) => {
        events.forEach((event) => {
          assert.ok(typeof event.id === 'number')
          assert.ok(typeof event.name === 'string')
          assert.ok(typeof event.href === 'string')
          assert.ok(event.date instanceof Date)
          assert.ok(typeof event.max === 'number')
          assert.ok(typeof event.cur === 'number')
          assert.ok(typeof event.status === 'string')
          assert.ok(typeof event.signupUrl === 'string' ||
            event.signupUrl === null)
          assert.ok(typeof event.menberListUrl === 'string' ||
            event.menberListUrl === null)
        })

        targetEventId = events.filter((event) => event.signupUrl && (event.max > event.cur))[1].id
        if (!targetEventId) { throw new Error('目前沒有可以測試的活動') }
      })
      .then(() => done(), done)
  })

  it('should 取得活動資訊', function (done) {
    api.getEvent(targetEventId)
      .then((event) => {
        assert.ok(typeof event.id === 'number')
        assert.ok(typeof event.name === 'string')
        assert.ok(typeof event.href === 'string')
        assert.ok(event.date instanceof Date)
        assert.ok(typeof event.place === 'string')
        assert.ok(typeof event.max === 'number')
        assert.ok(typeof event.status === 'string')
        assert.ok(typeof event.signupUrl === 'string' ||
            event.signupUrl === null)
        assert.ok(typeof event.menberListUrl === 'string' ||
            event.menberListUrl === null)
      })
      .then(() => done(), done)
  })

  it('should 取得活動報名名單', function (done) {
    api.getEventMember(targetEventId)
      .then((members) => {
        members.forEach((member) => {
          assert.ok(typeof member.name === 'string')
          assert.ok(typeof member.gender === 'number')
          assert.ok(member.gender === 1 || member.gender === 2)
          assert.ok(typeof member.from === 'string')
          assert.ok(typeof member.job === 'string')
        })
      })
      .then(() => done(), done)
  })

  it('should 取得報名活動清單', function (done) {
    api.getSignedupEvents(jar)
      .then((events) => {
        events.forEach((event) => {
          assert.ok(typeof event.id === 'number')
          assert.ok(typeof event.name === 'string')
          assert.ok(typeof event.href === 'string')
          assert.ok(event.date instanceof Date)
          assert.ok(typeof event.max === 'number')
          assert.ok(typeof event.cur === 'number')
          assert.ok(typeof event.menberListUrl === 'string' ||
            event.menberListUrl === null)
        })

        originSignedupEvents = events
      })
      .then(() => done(), done)
  })

  it('should 回傳 true 當報名成功的時候', function (done) {
    api.signupEvent(jar, targetEventId, conf.user.id)
      .then((result) => assert.strictEqual(result, true))
      .then(done, done)
  })

  it('should 回傳 true 當取消報名成功的時候', function (done) {
    api.getSignedupEvents(jar)
      // 找出新報名的活動
      .then((events) => events.filter((e) =>
        !originSignedupEvents.find((e2) => e2.id === e.id))[0])
      // 取得報名編號
      .then((newSignupEvent) => api.getSignSeq(jar, newSignupEvent.id))
      // 以報名編號來取消報名
      .then((signSeq) => assert.ok(api.cancelSignupEvent(jar, signSeq)))
      .then(() => done(), done)
  })

  it('should 回傳 false 當取消報名失敗的時候', function (done) {
    api.getSignedupEvents(jar)
      .then((signSeq) => assert.ok(api.cancelSignupEvent(jar, 9487)))
      .then(done, done)
  })

  it('should 回傳已認證的時數列表', function (done) {
    api.getApprovedGeneralEduList(jar)
      .then((list) => {
        if (list.length === 0) {
          throw new Error('無認證時數紀錄，無法測試。')
        }
        return list.forEach((row) => {
          assert.ok(typeof row.id === 'number')
          assert.ok(typeof row.name === 'string')
          assert.ok(typeof row.href === 'string')
          assert.ok(row.date instanceof Date)
          assert.ok(typeof row.hours === 'number')
        })
      })
      .then(() => done(), done)
  })

  it('should 三種種類的活動，等於全部活動', function (done) {
    Promise.all([
      api.getEvents('通識'),
      api.getEvents('心靈'),
      api.getEvents('語文'),
      api.getEvents('全部')
    ])
      .then((types) => {
        const
          concat = types[0].concat(types[1], types[2]),
          contain = concat.every((event) =>
            types[3].find((event2) =>
              event.id === event2.id))
        if (!contain) {
          throw new Error('"全部"不包含"其他三種"的聯集')
        }
      })
      .then(() => done(), done)
  })
})
