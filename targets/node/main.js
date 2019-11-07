#!/usr/bin/env node

'use strict'

var logger = require('logger')('main')

;(function init () {
  process.env.YODA_RUN_MODE = 'host'
  process.env.YODA_FLORA_URI = `unix:${__dirname}/flora.sock`

  var YodaFramework = require('yoda')

  logger.debug('yodaos framework is started')
  var runtime = new YodaFramework()
  runtime.init()
})()
