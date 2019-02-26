'use strict'

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var Flora = require('@yoda/flora')

var LIGHT_SOURCE = '/opt/light'
var MEDIA_SOURCE = '/opt/media'

var DND_MODE_ALPHA_FACTOR = 0.5
var NORMAL_MODE_ALPHA_FACTOR = 1

/**
 * convinient tools for call lightd
 * @param {object} dbusRegistry dbus client
 */
function Light (runtime) {
  EventEmitter.call(this)
  this.runtime = runtime
  this.dbusRegistry = runtime.component.dbusRegistry

  /**
   * @type {{ [appId: string]: number }}
   */
  this.ttsSoundCountMap = {}
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
  if (!option) {
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
 * play sound with tts speaking effect.
 * @param {string} appId
 * @param {string} uri
 * @return {Promise}
 */
Light.prototype.ttsSound = function (appId, uri) {
  if (this.ttsSoundCountMap[appId] == null) {
    this.ttsSoundCountMap[appId] = 0
  }
  ++this.ttsSoundCountMap[appId]
  this.play(appId, 'system://setSpeaking.js', {}, { shouldResume: true })
  return this.appSound(appId, uri)
    .then(
      () => {
        --this.ttsSoundCountMap[appId]
        if (this.ttsSoundCountMap[appId] === 0) {
          delete this.ttsSoundCountMap[appId]
          return this.stop(appId, 'system://setSpeaking.js')
        }
      },
      err => {
        --this.ttsSoundCountMap[appId]
        if (this.ttsSoundCountMap[appId] === 0) {
          delete this.ttsSoundCountMap[appId]
          this.stop(appId, 'system://setSpeaking.js')
        }
        throw err
      }
    )
}

/**
 * stop sound by specified appId
 * @param {string} appId your appId
 * @return {Promise}
 */
Light.prototype.stopSoundByAppId = function (appId) {
  if (!appId) {
    throw new Error('appId is required')
  }
  return this.lightMethod('stopSound', [appId])
}

/**
 * open pickup
 * @param {string} appId your appId
 * @param {number|string} duration auto close pickup after duration millisecond
 * @param {boolean} withAwaken true or false
 * @return {Promise}
 */
Light.prototype.setPickup = function (appId, duration, withAwaken) {
  var uri = this.transformPathScheme('system://setPickup.js', LIGHT_SOURCE)
  if (withAwaken) {
    this.runtime.component.flora.post('rokid.activation.play', [0], this.runtime.component.flora.MSGTYPE_INSTANT)
  }
  // lightd will waiting for `rokid.turen.end_voice` event to stop lights, so don't have to close it manually.
  return this.play(appId, uri, {
    degree: this.runtime.component.turen.degree,
    duration: duration || 6000
  }, {
    shouldResume: true
  })
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
 * This action will reset service to initialization state and close currently light. Also will clear all lights that need to resume.
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

// TODO using flora instand of dbus
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

/**
 * set night mode
 * @param {boolean} dndMode true if opened
 */
Light.prototype.setDNDMode = function (dndMode) {
  if (dndMode) {
    this.runtime.component.flora.post('rokid.lightd.global_alpha_factor',
      [DND_MODE_ALPHA_FACTOR], Flora.MSGTYPE_PERSIST)
  } else {
    this.runtime.component.flora.post('rokid.lightd.global_alpha_factor',
      [NORMAL_MODE_ALPHA_FACTOR], Flora.MSGTYPE_PERSIST)
  }
}

module.exports = Light
