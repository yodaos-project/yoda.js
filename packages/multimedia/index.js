'use strict';

/**
 * @namespace multimedia
 */

var native = require('./multimedia.node');
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;

/**
 * @class
 * @memberof multimedia
 */
function MediaPlayer(tag, options) {
  EventEmitter.call(this);
  this._handle = new native.Player(tag);
  this._handle.onevent = this.onevent.bind(this);
}
inherits(MediaPlayer, EventEmitter);

MediaPlayer.prototype.onevent = function(type, ext1, ext2, from) {
  var eventName = native.Events[type];
  if (!eventName) {
    this.emit('error', new Error(`cannot find event ${type}`));
    return;
  }
  if (eventName === 'prepared') {
    this._handle.start();
  } else {
    this.emit(eventName, ext1, ext2, from);
  }
};

/**
 * play a media with URL.
 * @param {String} url
 */
MediaPlayer.prototype.play = function(url) {
  if (!url)
    throw new Error('url must be a valid string');
  return this._handle.prepare(url);
};

/**
 * pause the playing media.
 */
MediaPlayer.prototype.pause = function() {
  return this._handle.pause();
};

/**
 * resume the paused media.
 */
MediaPlayer.prototype.resume = function() {
  return this._handle.resume();
};

/**
 * seek to `pos`.
 * @param {Number} pos - the position in ms.
 */
MediaPlayer.prototype.seek = function(pos) {
  return this._handle.seek(pos);
};

/**
 * stop the player.
 */
MediaPlayer.prototype.stop = function() {
  return this._handle.stop();
};

/**
 * reset the player.
 */
MediaPlayer.prototype.reset = function() {
  return this._handle.reset();
};

/**
 * disconnect and cleanup the player.
 */
MediaPlayer.prototype.disconnect = function() {
  return this._handle.disconnect();
};

/**
 * @property {String} id
 * @readable
 */
Object.defineProperty(MediaPlayer.prototype, 'id', {
  get: function() {
    return this.idGetter();
  }
});

/**
 * @property {Boolean} playing
 * @readable
 */
Object.defineProperty(MediaPlayer.prototype, 'playing', {
  get: function() {
    return this.playingStateGetter();
  }
});

/**
 * @property {Number} duration
 * @readable
 */
Object.defineProperty(MediaPlayer.prototype, 'duration', {
  get: function() {
    return this.durationGetter();
  }
});

/**
 * @property {Number} position
 * @readable
 */
Object.defineProperty(MediaPlayer.prototype, 'position', {
  get: function() {
    return this.positionGetter();
  }
});

/**
 * @property {Boolean} loopMode
 * @readable
 * @writable
 */
Object.defineProperty(MediaPlayer.prototype, 'loopMode', {
  get: function() {
    return this.loopModeGetter();
  },
  set: function(mode) {
    return this.loopModeSetter(mode);
  },
});

/**
 * @property {Number} volume
 * @readable
 * @writable
 */
Object.defineProperty(MediaPlayer.prototype, 'volume', {
  get: function() {
    return this.volumeGetter();
  },
  set: function(vol) {
    return this.volumeSetter(vol);
  }
});

/**
 * @property {String} sessionId
 * @readable
 * @writable
 */
Object.defineProperty(MediaPlayer.prototype, 'sessionId', {
  get: function() {
    return this.sessionIdGetter();
  },
  set: function(id) {
    return this.sessionIdSetter(id);
  }
});

exports.MediaPlayer = MediaPlayer;
exports.soundplayer = require('./soundplayer');

