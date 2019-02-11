var Service = require('/usr/yoda/services/lightd/service')
var test = require('tape')
var Effect = require('/usr/yoda/services/lightd/effects')
var effect = new Effect()
var light = new Service(effect)

test('loadfile should be ok if uri is exited--setStandby.js', t => {
  var rst = light.loadfile('@yoda', '/opt/light/loading.js', {}, {'shouldResume': true}, (err) => {
    t.ok(err === undefined)
  })
  t.strictEqual(rst, true, 'play setStandby')
  rst = light.loadfile('@yoda', '/opt/light/setSpeaking.js', {}, {}, (err) => {
    t.ok(err === undefined)
  })
  t.strictEqual(rst, false, `play setSpeaking ${rst}`)
  setTimeout(() => {
    light.stopFile('@yoda', '/opt/light/loading.js')
    light.stopFile('@yoda', '/opt/light/setSpeaking.js')
    t.end()
  }, 1000)
})
