'use strict'

/**
 * @namespace audio
 * @description The `audio` module exports `AudioManager`, which provides APIs to
 * to control volume of audio.
 *
 * ```js
 * var AudioManager = require('audio').AudioManager;
 * AudioManager.setVolume(AudioManager.STREAM_TTS, 30); // this sets the tts vol to 30.
 * AudioManager.getVolume(AudioManager.STREAM_AUDIO); // get the audio tts.
 * ```
 */

var native = require('./audio.node')

/**
 * @memberof audio
 * @constructor
 */
function AudioManager () {
  throw new TypeError('should not call this function')
}
exports.AudioManager = AudioManager

/**
 * @memberof audio.AudioManager
 * @var STREAM_AUDIO {Number} - Used to identify the volume of audio streams for audio.
 * @static
 */
AudioManager.STREAM_AUDIO = native.STREAM_AUDIO

/**
 * @memberof audio.AudioManager
 * @var STREAM_TTS {Number} - Used to identify the volume of audio streams for tts.
 * @static
 */
AudioManager.STREAM_TTS = native.STREAM_TTS

/**
 * @memberof audio.AudioManager
 * @var STREAM_PLAYBACK {Number} - Used to identify the volume of audio streams for
 *                                 multimedia.
 * @static
 */
AudioManager.STREAM_PLAYBACK = native.STREAM_PLAYBACK

/**
 * @memberof audio.AudioManager
 * @var STREAM_ALARM {Number} - Used to identify the volume of audio streams for alarm.
 * @static
 */
AudioManager.STREAM_ALARM = native.STREAM_ALARM

/**
 * @memberof audio.AudioManager
 * @var STREAM_SYSTEM {Number} - Used to identify the volume of audio streams for system.
 * @static
 */
AudioManager.STREAM_SYSTEM = native.STREAM_SYSTEM

/**
 * @memberof audio.AudioManager
 * @var LINEAR_RAMP {Function} - The linear curve function for `setVolumeShaper`.
 * @static
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
 * @memberof audio.AudioManager
 * @function setVolume
 * @param {Number} [stream=STREAM_AUDIO] - The stream type.
 * @param {Number} vol - The volume to set
 * @static
 * @throws {TypeError} `vol` is required.
 */
AudioManager.setVolume = function (stream, vol) {
  if (arguments.length === 1) {
    vol = stream
    stream = null
  }
  if (!vol) {
    throw new TypeError('vol is required')
  }

  if (stream !== null) {
    native.setStreamVolume(stream, vol)
  } else {
    native.setMediaVolume(vol)
  }
}

/**
 * Get the volume of the given stream.
 * @memberof audio.AudioManager
 * @function getVolume
 * @param {Number} [stream=STREAM_AUDIO] - The stream type.
 * @static
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
 * @memberof audio.AudioManager
 * @function isMuted
 * @returns {Boolean} if muted.
 * @static
 */
AudioManager.isMuted = function () {
  return native.isMuted()
}

/**
 * Set the volume to be mute or not.
 * @memberof audio.AudioManager
 * @function setMute
 * @param {Boolean} val - If muted.
 * @static
 */
AudioManager.setMute = function (val) {
  return native.setMute(!!val)
}

/**
 * Set the shaper of the volume.
 * @memberof audio.AudioManager
 * @function setVolumeShaper
 * @param {Function} shaper - The volume shaper function which returns an array with 100 elements.
 * @static
 * @throws {Error} shaper function should return an array with 100 elements.
 * @throws {RangeError} out of range when set volume shape.
 * @example
 * AudioManager.setVolumeShaper(AudioManager.LINEAR_RAMP)
 */
AudioManager.setVolumeShaper = function (shaper) {
  var max = 100
  var shape = shaper(max)
  if (!Array.isArray(shape) || shape.length !== max) { throw new Error('shaper function should return an array with 100 elements.') }

  for (var i = 0; i <= max; i++) {
    if (!native.setCurveForVolume(i, shape[i])) {
      throw new RangeError('out of range when set volume shape.')
    }
  }
  return true
}
