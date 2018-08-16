'use strict';

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

var native = require('./audio.node');

/**
 * @memberof audio
 * @constructor
 */
function AudioManager() {
  throw new TypeError('should not call this function');
}
exports.AudioManager = AudioManager;

/**
 * @memberof audio.AudioManager
 * @var STREAM_AUDIO {Number} - Used to identify the volume of audio streams for audio.
 * @static
 */
AudioManager.STREAM_AUDIO = native.STREAM_AUDIO;

/**
 * @memberof audio.AudioManager
 * @var STREAM_TTS {Number} - Used to identify the volume of audio streams for tts.
 * @static
 */
AudioManager.STREAM_TTS = native.STREAM_TTS;

/**
 * @memberof audio.AudioManager
 * @var STREAM_PLAYBACK {Number} - Used to identify the volume of audio streams for
 *                                 multimedia.
 * @static
 */
AudioManager.STREAM_PLAYBACK = native.STREAM_PLAYBACK;

/**
 * @memberof audio.AudioManager
 * @var STREAM_ALARM {Number} - Used to identify the volume of audio streams for alarm.
 * @static
 */
AudioManager.STREAM_ALARM = native.STREAM_ALARM;

/**
 * @memberof audio.AudioManager
 * @var STREAM_SYSTEM {Number} - Used to identify the volume of audio streams for system.
 * @static
 */
AudioManager.STREAM_SYSTEM = native.STREAM_SYSTEM;

/**
 * @memberof audio.AudioManager
 * @function setVolume
 * @param {Number} [stream=STREAM_AUDIO] - The stream type.
 * @param {Number} vol - The volume to set
 * @static
 * @throws {TypeError} `vol` is required.
 */
AudioManager.setVolume = function(stream, vol) {
  if (arguments.length === 1) {
    vol = stream;
    stream = null;
  }
  if (!vol) {
    throw new TypeError('vol is required');
  }

  if (stream !== null) {
    native.setStreamVolume(stream, vol);
  } else {
    native.setMediaVolume(vol);
  }
};

/**
 * @memberof audio.AudioManager
 * @function getVolume
 * @param {Number} [stream=STREAM_AUDIO] - The stream type.
 * @static
 */
AudioManager.getVolume = function(stream) {
  if (stream) {
    return native.getStreamVolume(stream);
  } else {
    return native.getMediaVolume();
  }
};

