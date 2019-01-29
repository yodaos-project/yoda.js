var Service = require('/usr/yoda/services/lightd/service')
var test = require('tape')
var Effect = require('/usr/yoda/services/lightd/effects')
var effect = new Effect()
var light = new Service(effect)

test('loadfile should be ok if uri is exited--setStandby.js', t => {
  var rst = light.loadfile('@yoda', '/opt/light/setStandby.js', {}, {'shouldResume': true}, () => {
    setTimeout(() => {
      light.stopPrev(true)
    }, 5000)
    t.end()
  })
  t.strictEqual(rst, true)
  rst = light.loadfile('@yoda', '/opt/light/setSpeaking.js', {}, {}, () => {
  })
  t.strictEqual(rst, false)
})
