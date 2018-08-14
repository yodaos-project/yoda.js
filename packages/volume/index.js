'use strict';

/**
 * @namespace volume
 */

var native = require('./volume.node');

/**
 * @memberof volume
 * @function set
 * @param {String} [stream] - the stream type, tts/audio/alarm.
 * @param {Number} vol - the volume to set
 */
exports.set = function(stream, vol) {
  if (arguments.length === 1 && typeof stream === 'number') {
    vol = stream;
    stream = null;
  }
  if (!vol) {
    throw new TypeError('vol is required');
  }

  if (stream) {
    native.setStreamVolume(stream, vol);
  } else {
    native.setMediaVolume(vol);
  }
};

/**
 * @memberof volume
 * @function get
 * @param {String} [stream] - the stream type, tts/audio/alarm
 */
exports.get = function(stream) {
  if (stream) {
    return native.getStreamVolume(stream);
  } else {
    return native.getMediaVolume();
  }
};

