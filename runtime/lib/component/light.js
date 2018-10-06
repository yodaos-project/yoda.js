'use strict'

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter

var LIGHT_SOURCE = '/opt/light'
var MEDIA_SOURCE = '/opt/media'

/**
 * convinient tools for call lightd
 * @param {object} dbusRegistry dbus client
 */
function Light (dbusRegistry) {
  EventEmitter.call(this)
  this.dbusRegistry = dbusRegistry
}
inherits(Light, EventEmitter)

/**
 * play light
 * @param {string} appId your appId
 * @param {string} uri the path of light uri
 * @param {object} [data] user's data for light
 * @param {object} [option]
 * @param {boolean} [option.shouldResume] should resume this light
 * @return {Promise}
 */
Light.prototype.play = function (appId, uri, data, option) {
  var path = this.transformPathScheme(uri, LIGHT_SOURCE)
  var dataStr
  var optionStr
  if (!data) {
    dataStr = '{}'
  } else {
    dataStr = JSON.stringify(data)
  }
  if (!optionStr) {
    optionStr = '{}'
  } else {
    optionStr = JSON.stringify(option)
  }
  return this.lightMethod('play', [appId, path, dataStr, optionStr])
}

/**
 * stop specified light through appId, clear recovery layer also
 * @param {string} appId your appId
 * @param {string} uri the uri of light to stop
 * @return {Promise}
 */
Light.prototype.stop = function (appId, uri) {
  var path = this.transformPathScheme(uri, LIGHT_SOURCE)
  return this.lightMethod('stop', [appId, path])
}

/**
 * stop any light through appId, clear recovery layer also
 * @param {string} appId your appId
 * @return {Promise}
 */
Light.prototype.stopByAppId = function (appId) {
  return this.lightMethod('stop', [appId, ''])
}

/**
 * play sound
 * @param {string} appId your appId
 * @param {string} uri the uri of sound
 * @return {Promise}
 */
Light.prototype.appSound = function (appId, uri) {
  var path = this.transformPathScheme(uri, MEDIA_SOURCE)
  return this.lightMethod('appSound', [appId, path])
}

/**
 * open pickup
 * @param {string} appId your appId
 * @param {number|string} duration auto close pickup after duration millisecond
 * @param {boolean} withAwaken true or false
 * @return {Promise}
 */
Light.prototype.setPickup = function (appId, duration, withAwaken) {
  return this.lightMethod('setPickup', [appId, '' + (duration || 6000), withAwaken])
}

/**
 * play setAwake light
 * @param {string} appId your appId
 * @return {Promise}
 */
Light.prototype.setAwake = function (appId) {
  return this.lightMethod('setAwake', [appId])
}

/**
 * play setDegree light
 * @param {string} appId your appId
 * @param {number} sl degree
 * @return {Promise}
 */
Light.prototype.setDegree = function (appId, sl) {
  return this.lightMethod('setDegree', [appId, '' + (sl || 0)])
}

/**
 * close currently light
 * @return {Promise}
 */
Light.prototype.reset = function () {
  return this.lightMethod('reset', [])
}

/**
 * transform uri
 * @param {string} uri uri
 * @param {string} prefix prefix to replace for schema
 */
Light.prototype.transformPathScheme = function (uri, prefix) {
  if (!uri || !prefix || uri === '') {
    throw new TypeError('uri and prefix must be a string')
  }
  if (uri && uri.substr(0, 9) === 'system://') {
    return prefix + '/' + uri.substr(9)
  }
  return uri
}

/**
 * @private
 */
Light.prototype.lightMethod = function (name, args) {
  return this.dbusRegistry.callMethod(
    'com.service.light',
    '/rokid/light',
    'com.rokid.light.key',
    name, args)
}

module.exports = Light
