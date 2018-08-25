'use strict'

/**
 * @module @yoda/speech
 */

var SpeechWrap = require('./speech.node').SpeechWrap
var speechConfig = {
  deviceId: null,
  deviceTypeId: null,
  key: null,
  secret: null
}

/**
 * initialize the speech config
 * @param {Object} config - the speech config
 * @param {String} config.deviceId - the device id
 * @param {String} config.deviceTypeId - the devide type id
 * @param {String} config.key - the cloud key
 * @param {String} config.secret - the cloud secret
 */
function initialize (config) {
  speechConfig.deviceId = config.deviceId
  speechConfig.deviceTypeId = config.deviceTypeId
  speechConfig.key = config.key
  speechConfig.secret = config.secret
  return true
}

/**
 * get the nlp result
 * @param {String} text - the input text
 * @param {Function} callback
 */
function getNlpResult (text, callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('callback must be a function')
  }
  if (!speechConfig.deviceId ||
    !speechConfig.deviceTypeId ||
    !speechConfig.key ||
    !speechConfig.secret) {
    return callback(new Error('speech is not initialized'))
  }

  var hostname = 'apigwws.open.rokid.com'
  var handle = new SpeechWrap()
  handle.onresult = function onresult (nlp, action) {
    if (!arguments.length) {
      callback(new Error('speech error'))
    } else {
      try {
        callback(null, JSON.parse(nlp), JSON.parse(action))
      } catch (err) {
        callback(err)
      }
    }
  }
  handle.prepare(hostname, 443, '/api',
    speechConfig.key,
    speechConfig.deviceTypeId,
    speechConfig.deviceId,
    speechConfig.secret)
  handle.putText(text)
}

exports.initialize = initialize
exports.getNlpResult = getNlpResult
