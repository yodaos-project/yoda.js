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

/**
 * @constructor
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
 * @param {Number} [stream=AudioManager.STREAM_AUDIO] - The stream type.
 * @param {Number} vol - The volume to set
 * @throws {TypeError} `vol` is required.
 */
AudioManager.setVolume = function (stream, vol) {
  if (arguments.length === 1) {
    vol = stream
    stream = null
  }
  if (typeof vol !== 'number') {
    throw new TypeError('vol must be a number')
  }

  if (stream !== null) {
    native.setStreamVolume(stream, vol)
  } else {
    native.setMediaVolume(vol)
  }
}

/**
 * Get the volume of the given stream.
 * @memberof module:@yoda/audio~AudioManager
 * @method getVolume
 * @param {Number} [stream=AudioManager.STREAM_AUDIO] - The stream type.
 */
AudioManager.getVolume = function (stream) {
  if (stream) {
    return native.getStreamVolume(stream)
  } else {
    return native.getMediaVolume()
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
AudioManager.setVolumeShaper = function (shaper) {
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
