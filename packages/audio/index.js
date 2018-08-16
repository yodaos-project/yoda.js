'use strict';

/**
 * @namespace audio
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
 * @var STREAM_AUDIO {Number} - Used to identify the volume of audio streams for audio.
 * @static
 */
AudioManager.STREAM_AUDIO = native.STREAM_AUDIO;

/**
 * @var STREAM_TTS {Number} - Used to identify the volume of audio streams for tts.
 * @static
 */
AudioManager.STREAM_TTS = native.STREAM_TTS;

/**
 * @var STREAM_PLAYBACK {Number} - Used to identify the volume of audio streams for
 *                                 multimedia.
 * @static
 */
AudioManager.STREAM_PLAYBACK = native.STREAM_PLAYBACK;

/**
 * @var STREAM_ALARM {Number} - Used to identify the volume of audio streams for alarm.
 * @static
 */
AudioManager.STREAM_ALARM = native.STREAM_ALARM;

/**
 * @var STREAM_SYSTEM {Number} - Used to identify the volume of audio streams for system.
 * @static
 */
AudioManager.STREAM_SYSTEM = native.STREAM_SYSTEM;

/**
 * @var STREAM_VOICE_CALL {Number} - Used to identify the volume of audio streams 
 *                                   for voice call.
 * @static
 * @private
 */
AudioManager.STREAM_VOICE_CALL = -1;

/**
 * @var STREAM_NOTIFICATION {Number} - Used to identify the volume of audio streams for
 *                                     notification.
 * @static
 * @private
 */
AudioManager.STREAM_NOTIFICATION = -1

/**
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
 * @function getVolume
 * @param {String} [stream] - the stream type, tts/audio/alarm
 * @static
 */
AudioManager.getVolume = function(stream) {
  if (stream) {
    return native.getStreamVolume(stream);
  } else {
    return native.getMediaVolume();
  }
};
