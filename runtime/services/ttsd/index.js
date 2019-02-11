'use strict'

require('@yoda/oh-my-little-pony')
  .catchUncaughtError('/data/system/ttsd-err.log')

var logger = require('logger')('ttsd')
var Service = require('./service')
var Flora = require('./flora')

var Dbus = require('dbus')
var Remote = require('../../lib/dbus-remote-call.js')
var lightd = new Remote(Dbus.getBus('session'), {
  dbusService: 'com.service.light',
  dbusObjectPath: '/rokid/light',
  dbusInterface: 'com.rokid.light.key'
})

var service = new Service(lightd)
var flora = new Flora(service)
flora.init()

logger.info('service ttsd started')
