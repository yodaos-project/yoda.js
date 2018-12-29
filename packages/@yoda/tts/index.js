'use strict'

/**
 * @module @yoda/tts
 * @description Synthesizes speech from text for immediate playback.
 */

var TtsWrap = require('./tts.node').TtsWrap
var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var TTSEvents = [
  /**
   * tts voice event, not yet used.
   * @event module:@yoda/tts~TtsProxy#voice
   * @private
   */
  'voice', // 0: not used
  /**
   * tts start event.
   * @event module:@yoda/tts~TtsProxy#start
   * @type {number} id - the task id.
   */
  'start', // 1: start
  /**
   * tts end event
   * @event module:@yoda/tts~TtsProxy#end
   * @type {number} id - the task id.
   */
  'end', // 2: end
  /**
   * tts cancel event
   * @event module:@yoda/tts~TtsProxy#cancel
   */
  'cancel', // 3: cancel
  /**
   * tts error event
   * @event module:@yoda/tts~TtsProxy#error
   * @type {Error} err - the error.
   */
  'error' // 4: error
]

// reference to handle
var refs = {}

/**
 * @constructor
 * @param {Object} handle
 * @param {String} text - the text to speak
 * @param {Function} callback
 */
function TtsRequest (handle, text, callback) {
  // this handleId for manager handle
  this._handleId = handle.speak(text)
  // this id for userspace
  this.id = this._handleId
  this.handle = handle
  this.text = text
  this.callback = callback
  this.state = 'ready'
  this.error = null
}

/**
 * stop this tts request.
 * @fires module:@yoda/tts~TtsProxy#cancel
 */
TtsRequest.prototype.stop = function () {
  process.nextTick(() => {
    this.state = 'cancel'
  })
  return this.handle.cancel(this._handleId)
}

/**
 * onstart
 * @private
 */
TtsRequest.prototype.onstart = function () {
  this.state = 'start'
}

/**
 * @param {Number} errno - the error code if something wrong.
 * @private
 */
TtsRequest.prototype.onend = function (type, errno) {
  if (type === 'error') {
    this.error = new Error('Tts occurrs error')
    this.error.code = errno
    this.error.id = this.id
    this.state = 'error'
  } else {
    this.state = type
  }
}

/**
 * returns the request.
 * @param {Number} err - the error.
 */
TtsRequest.prototype.returns = function () {
  if (typeof this.callback === 'function') {
    if (this.state === 'error') {
      this.callback(this.error)
    } else if (this.state !== 'start') {
      this.callback(null, this)
    }
  }
}

/**
 * @constructor
 * @augments EventEmitter
 * @param {Object} handle
 * @throws {Error} TTS task not found.
 */
function TtsProxy (handle) {
  EventEmitter.call(this)
  if (!handle) { throw new TypeError('handle must be specified') }

  this._requests = []
  this._handle = handle
  this._handle.onevent = this.onevent.bind(this)
}
inherits(TtsProxy, EventEmitter)

TtsProxy.prototype.onevent = function (name, handleId, errno) {
  var evt = TTSEvents[name]
  var req = this._requests[handleId]
  if (!req) {
    this.state = 'error'
    this.emit('error', new Error('TTS task not found'))
  } else {
    if (evt === 'start') {
      req.onstart()
    } else if (evt === 'end' ||
      evt === 'error' ||
      evt === 'cancel') {
      req.onend(evt, errno)
      delete this._requests[handleId]
    }
    this.emit(evt, req.id, errno)
    req.returns()
  }
}

/**
 * @param {String} text
 * @param {Function} cb - fired when tts is done
 * @returns {module:@yoda/tts~TtsRequest}
 */
TtsProxy.prototype.speak = function (text, cb) {
  var req = new TtsRequest(this._handle, text, cb)
  this._requests[req._handleId] = req
  return req
}

/**
 * stop all task
 */
TtsProxy.prototype.stopAll = function () {
  for (var i = 0; i < this._requests.length; i++) {
    this._requests[i].stop()
  }
}

/**
 * disconnect
 */
TtsProxy.prototype.disconnect = function () {
  this._requests.length = 0
  this.removeAllListeners()
  this._handle.disconnect()
}

TtsProxy.prototype.reconnect = function () {
  this._handle.reconnect()
}

function createHandle (options) {
  if (!options) { throw new TypeError('options is required') }
  if (!options.deviceId) { throw new TypeError('options.deviceId is required') }
  if (!options.deviceTypeId) { throw new TypeError('options.deviceTypeId is required') }
  if (!options.secret) { throw new TypeError('options.secret is required') }
  if (!options.key) { throw new TypeError('options.key is required') }

  var handle = refs.handle = new TtsWrap()
  handle.prepare(
    options.host || 'apigwws.open.rokid.com', 443, '/api',
    options.key,
    options.deviceTypeId,
    options.deviceId,
    options.secret,
    options.declaimer || 'zh',
    options.holdconnect)
  return handle
}

/**
 * Create a TTS instance by the given config.
 * @method createTts
 * @param {Object} options - the Rokid cloud options
 * @param {String} options.key - the key
 * @param {String} options.secret - the secret
 * @param {String} options.deviceId - the device id
 * @param {String} options.deviceTypeId - the device type id
 * @returns {module:@yoda/tts~TtsProxy}
 * @fires module:@yoda/tts~TtsProxy#voice
 * @fires module:@yoda/tts~TtsProxy#start
 * @fires module:@yoda/tts~TtsProxy#end
 * @fires module:@yoda/tts~TtsProxy#error
 * @example
 * var tts = require('@yoda/tts').createTts({ ... })
 * tts.speak('hello yoda!', () => {
 *   console.log('tts is complete')
 * })
 *
 */
function createTts (options) {
  var handle = createHandle(options)
  return new TtsProxy(handle)
}

exports.createHandle = createHandle
exports.createTts = createTts
