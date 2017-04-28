const
  api = require('../index.js'),
  conf = require('./test-config.json'),
  assert = require('assert'),
  jar = require('request').jar()

describe('登入', function() {
  it('should 回傳 true 當登入成功', function(done) {
    api.login(jar, conf.user.id, conf.user.password)
      .then((result) => assert.strictEqual(result, true))
      .then(done, done)
  })

  it('should 回傳 false 當密碼錯誤的時候', function(done) {
    this.timeout(10000);
    api.login(jar, conf.user.id, 'foobar')
      .then((result) => assert.strictEqual(result, false))
      .then(done, done)
  })
})

describe('線上報名系統', function() {
  let
    targetEventId,
    originSignedupEvents = []

  it('should 回傳活動列表陣列', function(done) {
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
        console.log(targetEventId)
      })
      .then(done, done)
  })

  it('should 取得報名活動清單', function(done) {
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
      .then(done, done)
  })

  it('should 回傳 true 當報名成功的時候', function(done) {
    api.signupEvent(jar, targetEventId, conf.user.id)
      .then((result) => assert.strictEqual(result, true))
      .then(done, done)
  })

  it('should 回傳 true 當取消報名成功的時候', function(done) {
    api.getSignedupEvents(jar)
      .then((events) => events.filter((e) => !originSignedupEvents.find((e2) => e2.id === e.id))[0])
      .then((newSignupEvent) => api.getSignSeq(jar, newSignupEvent.id))
      .then((signSeq) => assert.ok(api.cancelSignupEvent(jar, signSeq)))
      .then(done, done)
  })

  it('should 回傳 false 當取消報名失敗的時候', function(done) {
    api.getSignedupEvents(jar)
      .then((signSeq) => assert.ok(api.cancelSignupEvent(jar, 9487)))
      .then(done, done)
  })

  it('should 回傳已認證的時數列表', function(done) {
    api.getApprovedGeneralEduList(jar)
      .then((list) => list.forEach((row) => {
        assert.ok(typeof row.id === 'number')
        assert.ok(typeof row.name === 'string')
        assert.ok(typeof row.href === 'string')
        assert.ok(row.date instanceof Date)
        assert.ok(typeof row.hours === 'number')
      }))
      .then(done, done)
  })
})
