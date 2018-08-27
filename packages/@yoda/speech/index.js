'use strict'

/**
 * @module @yoda/speech
 * @private
 */

var SpeechWrap = require('./speech.node').SpeechWrap
var handle = null
var callback = null

var hostname = 'apigwws.open.rokid.com'
var speechConfig = {
  deviceId: null,
  deviceTypeId: null,
  key: null,
  secret: null
}

function defaultCb (empty, nlp, action) {
  console.log(`unhandled nlp ${nlp} ${action}`)
}

/**
 * start the text speech
 * @param {Object} config - the speech config
 * @param {String} config.deviceId - the device id
 * @param {String} config.deviceTypeId - the devide type id
 * @param {String} config.key - the cloud key
 * @param {String} config.secret - the cloud secret
 */
function start (config) {
  if (handle)
    return null

  speechConfig.deviceId = config.deviceId
  speechConfig.deviceTypeId = config.deviceTypeId
  speechConfig.key = config.key
  speechConfig.secret = config.secret

  // create handle instance
  handle = new SpeechWrap()
  handle.onresult = function onresult (nlp, action) {
    var cb = callback
    if (typeof cb !== 'function') {
      cb = defaultCb
    }
    if (!arguments.length) {
      cb(new Error('speech error'))
    } else {
      try {
        cb(null, JSON.parse(nlp), JSON.parse(action))
      } catch (err) {
        cb(err)
      }
    }
  }
  handle.prepare(hostname, 443, '/api',
    speechConfig.key,
    speechConfig.deviceTypeId,
    speechConfig.deviceId,
    speechConfig.secret)
  return true
}

/**
 * get the nlp result
 * @param {String} text - the input text
 * @param {Function} callback
 */
function getNlpResult (text, _callback) {
  if (typeof _callback !== 'function') {
    throw new TypeError('callback must be a function')
  }
  if (!handle) {
    return callback(new Error('speech is not initialized'))
  }
  callback = _callback
  handle.putText(text)
}

exports.start = start
exports.getNlpResult = getNlpResult
