'use strict'

var logger = require('logger')('main')
var exodus = require('@yoda/exodus')

require('@yoda/oh-my-little-pony')
  .catchUncaughtError('/data/system/yodart-err.log')
require('./watchdog').startFeeding((err) => {
  if (err) {
    logger.error(`watchdog failed to create(${err && err.message}), just exits`)
    process.exit(1)
  }
})
var AppRuntime = require('../../lib/app-runtime')

;(function init () {
  activateProcess()
  entry()
})()

function activateProcess () {
  // currently this is a workaround for nextTick missing.
  setInterval(() => false, 1000)
}

function entry () {
  logger.info('trying to migrate from lua')
  exodus((err) => {
    if (err) {
      logger.error('Unexpected error on migration from lua', err.stack)
    }

    logger.debug('vui is started')

    var runtime = new AppRuntime()
    runtime.init(['/opt/apps'])
  })
}
