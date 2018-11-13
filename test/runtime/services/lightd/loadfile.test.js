var Service = require('/usr/yoda/services/lightd/service')
var test = require('tape')
var Effect = require('/usr/yoda/services/lightd/effects')
var effect = new Effect()
var light = new Service(effect)

test('loadfile should be ok if uri is exited--setStandby.js', t => {
  light.loadfile('@yoda', '/opt/light/setStandby.js', {}, {'shouldResume': true}, err => {
    t.ok(err !== null)
    setTimeout(() => {
      light.stopPrev(true)
    }, 5000)
    t.end()
  })
})
