'use strict'

var cloudgw = require('@yoda/cloudgw')
var ota = require('@yoda/ota')
var system = require('system')
var logger = require('logger')('otad')

// TODO: await network available
cloudgw.config = null
ota.run(function onOTA (err, imagePath) {
  logger.info('ota ran')
  if (err) {
    logger.error(err.message, err.stack)
    system.prepareOta('')
    return
  }
  if (!imagePath) {
    logger.info('No updates found, exiting.')
    system.prepareOta('')
    return
  }
  system.prepareOta(imagePath)
  logger.info('OTA prepared, trying to reboot.')
  system.reboot()
})
