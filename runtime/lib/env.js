'use strict'

var fs = require('fs')
var path = require('path')
var property = require('@yoda/property')
var logger = require('logger')('env')
var defaults = require('../env.json')
var config = null

function get () {
  return Object.assign({}, config)
}

function load (env) {
  if (!env) {
    config = defaults
    logger.log('use default env')
    return
  }
  var loc = path.join(__dirname, `../env.${env}.json`)
  if (fs.existsSync(loc)) {
    config = Object.assign({}, defaults, require(loc))
    logger.log(`use ${env} env`)
  }
  return get()
}

load(property.get('persist.sys.rokid.env'))
module.exports = get
module.exports.load = load
