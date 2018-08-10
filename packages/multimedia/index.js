'use strict';

/**
 * @namespace multimedia
 */

var native = require('./multimedia.node');
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;

/**
 * @constructor
 * @memberof multimedia
 * @param {String} tag - the tag for player
 */
function MediaPlayer(tag) {
  EventEmitter.call(this);
  this._tag = tag;
  this._handle = null;
  this._initialize();
}
inherits(MediaPlayer, EventEmitter);

MediaPlayer.prototype._initialize = function() {
  this._handle = new native.Player(this._tag);
  this._handle.onprepared = this.onprepared.bind(this);
  this._handle.onplaybackcomplete = this.onplaybackcomplete.bind(this);
  this._handle.onbufferingupdate = this.onbufferingupdate.bind(this);
  this._handle.onseekcomplete = this.onseekcomplete.bind(this);
  this._handle.onerror = this.onerror.bind(this);
};

MediaPlayer.prototype.onprepared = function() {
  this.emit('prepared');
};

MediaPlayer.prototype.onplaybackcomplete = function() {
  this.emit('playbackcomplete');
};

MediaPlayer.prototype.onbufferingupdate = function() {
  this.emit('bufferingupdate');
};

MediaPlayer.prototype.onseekcomplete = function() {
  this.emit('seekcomplete');
};

MediaPlayer.prototype.onerror = function() {
  this.emit('error', new Error('something went wrong'));
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
 * @peoperty {String} id
 * @readonly
 */
Object.defineProperty(MediaPlayer.prototype, 'id', {
  get: function() {
    return this._handle.idGetter();
  }
});

/**
 * @property {Boolean} playing
 * @readable
 */
Object.defineProperty(MediaPlayer.prototype, 'playing', {
  get: function() {
    return this._handle.playingStateGetter();
  }
});

/**
 * @property {Number} duration
 * @readable
 */
Object.defineProperty(MediaPlayer.prototype, 'duration', {
  get: function() {
    return this._handle.durationGetter();
  }
});

/**
 * @property {Number} position
 * @readable
 */
Object.defineProperty(MediaPlayer.prototype, 'position', {
  get: function() {
    return this._handle.positionGetter();
  }
});

/**
 * @property {Boolean} loopMode
 * @readable
 * @writable
 */
Object.defineProperty(MediaPlayer.prototype, 'loopMode', {
  get: function() {
    return this._handle.loopModeGetter();
  },
  set: function(mode) {
    return this._handle.loopModeSetter(mode);
  },
});

/**
 * @property {Number} volume
 * @readable
 * @writable
 */
Object.defineProperty(MediaPlayer.prototype, 'volume', {
  get: function() {
    return this._handle.volumeGetter();
  },
  set: function(vol) {
    return this._handle.volumeSetter(vol);
  }
});

/**
 * @property {String} sessionId
 * @readable
 * @writable
 */
Object.defineProperty(MediaPlayer.prototype, 'sessionId', {
  get: function() {
    return this._handle.sessionIdGetter();
  },
  set: function(id) {
    return this._handle.sessionIdSetter(id);
  }
});

exports.MediaPlayer = MediaPlayer;
