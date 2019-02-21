var Service = require('/usr/yoda/services/lightd/service')
var test = require('tape')
var Effect = require('/usr/yoda/services/lightd/effects')
var effect = new Effect()
var light = new Service(effect)

test('reset should be ok', t => {
  light.reset()
  var systemEmpty = true
  light.systemspaceZIndex.forEach(element => {
    if (element !== undefined) {
      systemEmpty = false
    }
  })
  var userEmpty = true
  light.userspaceZIndex.forEach(element => {
    if (element !== undefined) {
      userEmpty = false
    }
  })
  t.strictEqual(systemEmpty, true, 'systemspaceZIndex should be empty!')
  t.strictEqual(userEmpty, true, 'userEmpty should be empty!')
  t.end()
})
