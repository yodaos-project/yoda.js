var Service = require('/usr/yoda/services/lightd/service')
var logger = require('logger')('lightdtest')
var test = require('tape')
var Effect = require('/usr/yoda/services/lightd/effects')
var effect = new Effect()
var light = new Service(effect)

test('appSound should be play success', t => {
  light.appSound('@yoda', '/opt/media/wakeup.ogg', bc => {
    logger.info('===appSound call back===')
    logger.info(bc)
    t.ok(bc !== null)
  })
  t.end()
})
