'use strict'

require('@yoda/oh-my-little-pony')
  .catchUncaughtError('/data/system/ttsd-err.log')

var logger = require('logger')('ttsd')
var Service = require('./service')
var Flora = require('./flora')

var service = new Service()
var flora = new Flora(service)
flora.init()

logger.info('service ttsd started')
