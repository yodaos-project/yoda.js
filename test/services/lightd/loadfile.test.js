var Service = require('/usr/yoda/services/lightd/service')
var test = require('tape')

test('loadfile should be ok if uri is exited--setStandby.js', t => {
  var service = new Service()
  var rst = service.loadfile('@yoda', '/opt/light/loading.js', {}, {'shouldResume': true}, (err) => {
    t.ok(err === undefined)
  })
  t.strictEqual(rst, true, 'play setStandby')
  rst = service.loadfile('@yoda', '/opt/light/setSpeaking.js', {}, {}, (err) => {
    t.ok(err === undefined)
  })
  t.strictEqual(rst, false, `play setSpeaking ${rst}`)
  setTimeout(() => {
    service.stopFile('@yoda', '/opt/light/loading.js')
    service.stopFile('@yoda', '/opt/light/setSpeaking.js')
    t.end()
  }, 1000)
})

test('Test priority', (t) => {
  t.plan(2)
  var service = new Service()

  var res = service.loadfile('@testAppId', '/opt/light/loading.js', { muted: true }, { shouldResume: true }, function noop () {})
  t.strictEqual(res, true, '/opt/light/loading.js should be render now')

  res = service.loadfile('@bluetooth', '/opt/light/inCall.js', {}, { shouldResume: true, zIndex: 2 }, function noop () {})
  t.strictEqual(res, false, '/opt/light/inCall.js should not be render.')

  service.reset()
})
