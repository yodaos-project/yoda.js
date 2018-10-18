'use strict'

var fs = require('fs')
var property = require('@yoda/property')
var logger = require('logger')('env')
var defaults = require('/etc/yoda/env.json')
var config

function get () {
  return Object.assign({}, config)
}

function load (env) {
  if (!env) {
    config = defaults
    logger.log('use default env')
    return
  }
  var loc = `/etc/yoda/env.${env}.json`
  if (fs.existsSync(loc)) {
    config = Object.assign({}, defaults, require(loc))
    logger.log(`use ${env} env`)
  }
  return get()
}

load(property.get('persist.sys.rokid.env'))
module.exports = get
module.exports.load = load
