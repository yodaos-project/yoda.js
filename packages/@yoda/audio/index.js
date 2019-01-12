'use strict'

/**
 * @module @yoda/audio
 * @description The `audio` module exports `AudioManager`, which provides APIs to
 * to control volume of audio.
 *
 * ```js
 * var AudioManager = require('@yoda/audio').AudioManager;
 * AudioManager.setVolume(AudioManager.STREAM_TTS, 30); // this sets the tts vol to 30.
 * AudioManager.getVolume(AudioManager.STREAM_AUDIO); // get the audio tts.
 * ```
 */

var native = require('./audio.node')
var manifest = require('@yoda/manifest')
var property = require('@yoda/property')
var logger = require('logger')('audio')
/**
 * This define the streams config
 */
var AudioBase = {
  /**
   * default volume
   */
  DEFAULT_VOLUME: _getNumber('audio.volume.init', 60)
}

function _getNumber (key, defaults) {
  var num = parseInt(manifest.getDefaultValue(key))
  return isNaN(num) ? defaults : num
}

function _storeVolume (stream, vol) {
  vol = Math.floor(vol)
  property.set(stream.key, vol, 'persist')
  native.setStreamVolume(stream.id, vol)
}

function _getVolume (stream) {
  var vol = parseInt(property.get(stream.key, 'persist'))
  if (isNaN(vol)) {
    return false
  } else {
    return vol
  }
}

function _getPlayingStatus (stream) {
  return native.getStreamPlayingStatus(stream.id)
}

function defineStream (id, name, options) {
  options = options || {}
  var stream = AudioBase[id] = {
    id: id,
    name: name,
    readonly: options.readonly || undefined,
    get key () {
      return `audio.volume.${this.name}`
    }
  }

  if (_getVolume(stream) === false) {
    _storeVolume(stream, AudioBase.DEFAULT_VOLUME)
  }
}

/**
 * @class
 */
function AudioManager () {
  throw new TypeError('should not call this function')
}
exports.AudioManager = AudioManager

/**
 * @memberof module:@yoda/audio~AudioManager
 * @member {Number} STREAM_AUDIO - Used to identify the volume of audio streams for audio.
 */
AudioManager.STREAM_AUDIO = native.STREAM_AUDIO

/**
 * @memberof module:@yoda/audio~AudioManager
 * @member {Number} STREAM_TTS  - Used to identify the volume of audio streams for tts.
 */
AudioManager.STREAM_TTS = native.STREAM_TTS

/**
 * @memberof module:@yoda/audio~AudioManager
 * @member {Number} STREAM_RING  - Used to identify the volume of audio streams for ring.
 */
AudioManager.STREAM_RING = native.STREAM_RING

/**
 * @memberof module:@yoda/audio~AudioManager
 * @member {Number} STREAM_RING  - Used to identify the volume of audio streams for voice call.
 */
AudioManager.STREAM_VOICE_CALL = native.STREAM_VOICE_CALL

/**
 * @memberof module:@yoda/audio~AudioManager
 * @member {Number} STREAM_PLAYBACK  - Used to identify the volume of audio streams for
 * multimedia.
 */
AudioManager.STREAM_PLAYBACK = native.STREAM_PLAYBACK

/**
 * @memberof module:@yoda/audio~AudioManager
 * @member {Number} STREAM_ALARM - Used to identify the volume of audio streams for alarm.
 */
AudioManager.STREAM_ALARM = native.STREAM_ALARM

/**
 * @memberof module:@yoda/audio~AudioManager
 * @member {Number} STREAM_SYSTEM - Used to identify the volume of audio streams for system.
 */
AudioManager.STREAM_SYSTEM = native.STREAM_SYSTEM

/**
 * @typedef Shaper
 */

/**
 * The linear curve function for `setVolumeShaper`.
 * @memberof module:@yoda/audio~AudioManager
 * @member {module:@yoda/audio~Shaper} LINEAR_RAMP
 */
AudioManager.LINEAR_RAMP = function (len) {
  var shape = []
  for (var i = 0; i <= len; i++) {
    shape[i] = i
  }
  return shape
}

/**
 * Set the volume of the given stream.
 * @memberof module:@yoda/audio~AudioManager
 * @method setVolume
 * @param {Number} [stream=AudioManager.STREAM_TTS] - The stream type.
 * @param {Number} vol - The volume to set
 * @throws {TypeError} vol must be a number
 * @throws {TypeError} invalid stream type
 * @throws {Error} stream type readonly
 */
AudioManager.setVolume = function (type, vol) {
  if (arguments.length === 1) {
    vol = type
    type = null
  }
  if (type && !AudioBase[type]) {
    throw new TypeError('invalid stream type')
  }
  if (typeof vol !== 'number') {
    throw new TypeError('vol must be a number')
  }
  if (vol > 100) {
    vol = 100
  } else if (vol < 0) {
    vol = 0
  }

  if (type === null) {
    ;[
      AudioManager.STREAM_AUDIO,
      AudioManager.STREAM_ALARM,
      AudioManager.STREAM_PLAYBACK,
      AudioManager.STREAM_TTS,
      AudioManager.STREAM_RING,
      AudioManager.STREAM_SYSTEM
    ].forEach(it => AudioManager.setVolume(it, vol))
    return
  }

  var stream = AudioBase[type]
  return _storeVolume(stream, vol)
}

/**
 * Set the volume to user land streams.
 *
 * Streams would be set:
 * - STREAM_AUDIO
 * - STREAM_PLAYBACK
 * - STREAM_TTS
 * - STREAM_RING
 *
 * @memberof module:@yoda/audio~AudioManager
 * @method setUserLandVolume
 * @param {Number} vol - The volume to set
 * @throws {TypeError} vol must be a number
 */
AudioManager.setUserLandVolume = function setUserLandVolume (vol) {
  ;[
    AudioManager.STREAM_AUDIO,
    AudioManager.STREAM_PLAYBACK,
    AudioManager.STREAM_TTS,
    AudioManager.STREAM_RING
  ].forEach(it => AudioManager.setVolume(it, vol))
}

/**
 * Get the volume of the given stream.
 * @memberof module:@yoda/audio~AudioManager
 * @method getVolume
 * @param {Number} [stream=AudioManager.STREAM_AUDIO] - The stream type.
 * @throws {TypeError} invalid stream type
 */
AudioManager.getVolume = function (stream) {
  if (stream !== undefined) {
    if (!AudioBase[stream]) {
      throw new TypeError('invalid stream type')
    }
    return _getVolume(AudioBase[stream])
  } else {
    return _getVolume(AudioBase[native.STREAM_AUDIO])
  }
}

/**
 * Get if the volume is muted.
 * @memberof module:@yoda/audio~AudioManager
 * @method isMuted
 * @returns {Boolean} if muted.
 */
AudioManager.isMuted = function () {
  return native.isMuted()
}

/**
 * Set the volume to be mute or not.
 * @memberof module:@yoda/audio~AudioManager
 * @method setMute
 * @param {Boolean} val - If muted.
 */
AudioManager.setMute = function (val) {
  return native.setMute(!!val)
}

/**
 * Set the shaper of the volume.
 * @memberof module:@yoda/audio~AudioManager
 * @method setVolumeShaper
 * @param {module:@yoda/audio~Shaper} shaper - The volume shaper function which returns an array with 100 elements.
 * @throws {Error} shaper function should return an array with 100 elements.
 * @throws {RangeError} out of range when set volume shape.
 * @example
 * AudioManager.setVolumeShaper(AudioManager.LINEAR_RAMP)
 */
AudioManager.setVolumeShaper = function setVolumeShaper (shaper) {
  var max = 100
  var shape = shaper(max)
  if (!Array.isArray(shape)) { throw new Error('shaper function should return an array with 100 elements.') }

  for (var i = 0; i <= max; i++) {
    if (!native.setCurveForVolume(i, shape[i])) {
      throw new RangeError('out of range when set volume shape.')
    }
  }
  return true
}

/**
 * Modules that will record playing state
 */
var playingMap = {
  bluetooth: 'audio.bluetooth.playing',
  multimedia: 'audio.multimedia.playing',
  tts: 'audio.tts.playing'
}

/**
 * Set the playing state of the given modules.
 * @memberof module:@yoda/audio~AudioManager
 * @method setPlayingState
 * @param {String} Specified module name - 'bluetooth', 'multimedia', 'tts'.
 * @param {boolean} state - true: playing, false : stop
 */
AudioManager.setPlayingState = function setPlayingState (name, state) {
  var key = playingMap[name]
  if (!key) {
    logger.error(`The module ${name} do not have playing state`)
    return
  }
  property.set(key, state)
}

/**
 * Get the playing state of all or specified modules.
 * @memberof module:@yoda/audio~AudioManager
 * @method getPlayingState
 * @param {String} name - 'bluetooth', 'multimedia', 'tts'.
 * @throws {TypeError} invalid audio name
 * @returns {boolean} true: playing, false : stop
 */
AudioManager.getPlayingState = function getPlayingState (name) {
  var key = playingMap[name]
  if (key) {
    return property.get(key) === 'true'
  } else {
    throw new TypeError('invalid audio name')
  }
}

/**
 * Get the playing status of the given stream.
 * @memberof module:@yoda/audio~AudioManager
 * @method getPlayingStatus
 * @param {Number} [stream=AudioManager.STREAM_AUDIO] - The stream type.
 * @throws {TypeError} invalid stream type
 * @returns {Boolean} true: stream is connected and playing, false: stream is unconnected.
 */
AudioManager.getPlayingStatus = function (stream) {
  if (stream !== undefined) {
    if (!AudioBase[stream]) {
      throw new TypeError('invalid stream type')
    }
    return _getPlayingStatus(AudioBase[stream])
  } else {
    return _getPlayingStatus(AudioBase[native.STREAM_TTS])
  }
}

/**
 * Get the human readable string for the stream type
 * @method getStreamName
 * @returns {string} return the stream type name, "audio", "tts", "playback", "alarm" and "system".
 */
AudioManager.getStreamName = function getStreamName (type) {
  return AudioBase[type] && AudioBase[type].name
}

;(function init () {
  defineStream(native.STREAM_AUDIO, 'audio')
  defineStream(native.STREAM_TTS, 'tts')
  defineStream(native.STREAM_RING, 'ring')
  defineStream(native.STREAM_VOICE_CALL, 'voiceCall')
  defineStream(native.STREAM_PLAYBACK, 'playback')
  defineStream(native.STREAM_ALARM, 'alarm')
  defineStream(native.STREAM_SYSTEM, 'system')
})()
