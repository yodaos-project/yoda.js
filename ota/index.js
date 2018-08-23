'use strict'

var cloudgw = require('@yoda/cloudgw')
var ota = require('@yoda/ota')
var system = require('@yoda/system')
var logger = require('logger')('otad')

var extapp = require('extapp')

var service = new extapp.ExtAppService(extapp.DbusAdapter, {
  dbusService: 'com.rokid.AmsExport',
  dbusObjectPath: '/extapp/test',
  dbusInterface: 'com.test.interface'
})

service.on('ready', () => {
  logger.info('service ready')
})
service.on('error', (err) => {
  logger.info('service ', err.stack)
})

var ready = false
var startTimer = setTimeout(() => {
  if (!ready) {
    logger.error('Unable to reach ready state after 5s of waiting.')
    process.exit(1)
  }
}, 5 * 1000)

var app = service.create('@ota')
app.on('ready', () => {
  app.get('all').then(result => {
    var config
    try {
      config = JSON.parse(result && result[0])
    } catch (err) {
      logger.error('Failed to parse props', err.stack)
      return
    }
    cloudgw.config = config

    ready = true
    clearTimeout(startTimer)
    main(function () {
      process.exit()
    })
  },
  error => {
    logger.error('get prop error', error)
  })
})

app.on('error', error => {
  logger.error('unexpected error on extapp', error && error.stack)
})

function main (done) {
  ota.runInCurrentContext(function onOTA (err, info) {
    logger.info('ota ran')
    if (err) {
      logger.error(err.message, err.stack)
      ota.resetOta()
      return done()
    }
    var imagePath = info && info.imagePath
    if (typeof imagePath !== 'string') {
      logger.info('No updates found, exiting.')
      ota.resetOta()
      return done()
    }
    var ret = system.prepareOta(imagePath)
    logger.info(
      `OTA prepared with status code ${ret}, terminating.`)
    done()
  })
}
