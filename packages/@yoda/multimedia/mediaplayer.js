'use strict'

var native = require('./mediaplayer.node')
var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var AudioManager = require('@yoda/audio').AudioManager

/**
 * @class
 * @memberof module:@yoda/multimedia
 * @description The MediaPlayer includes support for playing variety of common media types, so that you can
 *              easily integrate audio into your applications.
 *
 * ```js
 * var AudioManager = require('@yoda/audio').AudioManager;
 * var MediaPlayer = require('@yoda/multimedia').MediaPlayer;
 *
 * var player = new MediaPlayer(AudioManager.STREAM_PLAYBACK);
 * player.start('/res/play.ogg');
 * ```
 *
 * The following are what we supported audio codec:
 * - aac
 * - aac_latm
 * - ac3
 * - adpcm_*
 * - alac
 * - amrnb
 * - amrwb
 * - ape
 * - atrac3
 * - flac
 * - mp2
 * - mp3*
 * - mpc7
 * - mpc8
 * - opus
 * - pcm_*
 * - vorbis
 * - wavpack
 * - wmav1
 * - wmav2
 * - wmalossless
 * - wmapro
 *
 * And we supported multiple transfering protocols:
 * - file
 * - http/https
 * - icecast
 * - rtp
 * - tcp
 * - udp
 * - tls_openssl
 *
 * @param {number} [stream=STREAM_PLAYBACK] - the stream type of the player.
 * @fires module:@yoda/multimedia~MediaPlayer#prepared
 * @fires module:@yoda/multimedia~MediaPlayer#playbackcomplete
 * @fires module:@yoda/multimedia~MediaPlayer#bufferingupdate
 * @fires module:@yoda/multimedia~MediaPlayer#seekcomplete
 * @fires module:@yoda/multimedia~MediaPlayer#error
 */
function MediaPlayer (stream) {
  EventEmitter.call(this)
  this._stream = stream || AudioManager.STREAM_PLAYBACK
  this._handle = null
  this._seekcompleteCb = null
  this._initialize()
  /**
   * @property {string} indicates current state of the player
   */
  this.status = MediaPlayer.status.idle
  this._ignoreCancelEvent = false
}
inherits(MediaPlayer, EventEmitter)

/**
 * @memberof module:@yoda/multimedia~MediaPlayer
 * @member {object} status
 */
MediaPlayer.status = {
  idle: 'idle',
  preparing: 'preparing',
  prepared: 'prepared'
}

/**
 * Initialize the media player, set callbacks
 * @private
 */
MediaPlayer.prototype._initialize = function () {
  var streamName = AudioManager.getStreamName(this._stream)
  this._handle = new native.Player(streamName)
  this._handle.onprepared = this.onprepared.bind(this)
  this._handle.onplaybackcomplete = this.onplaybackcomplete.bind(this)
  this._handle.onbufferingupdate = this.onbufferingupdate.bind(this)
  this._handle.onseekcomplete = this.onseekcomplete.bind(this)
  this._handle.onplayingstatus = this.onplayingstatus.bind(this)
  this._handle.onblockpausemode = this.onblockpausemode.bind(this)
  this._handle.onerror = this.onerror.bind(this)
}

/**
 * Prepare is ready
 * @private
 */
MediaPlayer.prototype.onprepared = function () {
  var vol = AudioManager.getVolume(this._stream)
  AudioManager.setVolume(this._stream, vol)
  this.status = MediaPlayer.status.prepared
  /**
   * Prepared event, media resource is loaded
   * @event module:@yoda/multimedia~MediaPlayer#prepared
   */
  this.emit('prepared')
}

MediaPlayer.prototype.onplaybackcomplete = function () {
  this._ignoreCancelEvent = true
  /**
   * Fired when media playback is complete.
   * @event module:@yoda/multimedia~MediaPlayer#playbackcomplete
   */
  this.emit('playbackcomplete')
}

MediaPlayer.prototype.onbufferingupdate = function () {
  /**
   * Fired when media buffer is update.
   * @event module:@yoda/multimedia~MediaPlayer#bufferingupdate
   */
  this.emit('bufferingupdate')
}

MediaPlayer.prototype.onseekcomplete = function () {
  if (typeof this._seekcompleteCb === 'function') {
    this._seekcompleteCb()
    this._seekcompleteCb = null
  }
  /**
   * Fired when media seek is complete.
   * @event module:@yoda/multimedia~MediaPlayer#seekcomplete
   */
  this.emit('seekcomplete')
}

MediaPlayer.prototype.onplayingstatus = function (ext1, ext2) {
  // TODO: nothing to to now
}

MediaPlayer.prototype.onblockpausemode = function (ext1, ext2) {
  this.blockpausemodeEnabled = ext1 === 0
  /**
   * Fired when player is blocked for no cache available to play.
   * @event module:@yoda/multimedia~MediaPlayer#blockpausemode
   * @param {boolean} enabled
   */
  this.emit('blockpausemode', this.blockpausemodeEnabled)
}

MediaPlayer.prototype.onerror = function () {
  this._ignoreCancelEvent = true
  /**
   * Fired when something went wrong.
   * @event module:@yoda/multimedia~MediaPlayer#error
   * @type {Error}
   */
  this.emit('error', new Error('something went wrong'))
}

/**
 * prepare with the given resource(URI).
 * @param {string} uri - The resource uri to play.
 * @throws {Error} uri must be a valid string.
 */
MediaPlayer.prototype.prepare = function (uri) {
  if (!uri) {
    throw new Error('url must be a valid string')
  }
  this.status = MediaPlayer.status.preparing
  return this._handle.prepare(uri)
}

/**
 * start asynchronously.
 * @param {string} uri - The resource uri to play.
 * @throws {Error} uri must be a valid string.
 */
MediaPlayer.prototype.start = function (uri) {
  if (uri) {
    this._handle.prepare(uri)
    this.once('prepared', () => this._handle.start())
    return
  }
  if (this.status === MediaPlayer.status.preparing) {
    this.once('prepared', () => this._handle.start())
    return
  }
  return this._handle.start()
}

/**
 * This stops the `MediaPlayer` instance, `.stop()` will destroy
 * the handle and emit 'cancel' event.
 *
 * > Don't use the instance anymore when you stopped it.
 */
MediaPlayer.prototype.stop = function () {
  this._handle.stop()
  // after error or complete event emit, the cancel event should not emit.
  // because only one event can be emit.
  if (this._ignoreCancelEvent) {
    return
  }
  /**
   * this event is fired when the player is cancel.
   * @event module:@yoda/multimedia~MediaPlayer#cancel
   */
  this.emit('cancel')
}

/**
 * pause the playing media.
 */
MediaPlayer.prototype.pause = function () {
  return this._handle.pause()
}

/**
 * resume the paused media.
 */
MediaPlayer.prototype.resume = function () {
  if (this.status === MediaPlayer.status.preparing) {
    this.once('prepared', () => this._handle.resume())
    return
  }
  return this._handle.resume()
}

/**
 * seek to `pos`.
 * @param {number} pos - the position in ms.
 * @param {function} callback - get called when seek complete
 */
MediaPlayer.prototype.seek = function (pos, callback) {
  process.nextTick(() => {
    if (typeof callback === 'function') {
      this._seekcompleteCb = callback
    }
    return this._handle.seek(pos)
  })
}

/**
 * get the  volume
 */
MediaPlayer.prototype.getVolume = function () {
  return this._handle.getVolume()
}

/**
 * reset the player.
 * @private
 */
MediaPlayer.prototype.reset = function () {
  return this._handle.reset()
}

/**
 * set play speed.
 * @param {number} speed - the speed.
 * @private
 */
MediaPlayer.prototype.setSpeed = function (speed) {
  if (speed <= 2 && speed > 0) {
    speed = (speed - 1) * 100
  } else {
    speed = 0
  }
  return this._handle.setTempoDelta(speed)
}

/**
 * disconnect the player.
 * @private
 */
MediaPlayer.prototype.disconnect = function () {
  return this.stop()
}

/**
 * @memberof @yoda/multimedia~MediaPlayer
 * @member {string} id - the player id.
 */
Object.defineProperty(MediaPlayer.prototype, 'id', {
  get: function () {
    return this._handle.idGetter()
  },
  set: function (val) {
    throw new Error('the property id is readonly')
  }
})

/**
 * @member {boolean} playing
 * @memberof @yoda/multimedia~MediaPlayer
 */
Object.defineProperty(MediaPlayer.prototype, 'playing', {
  get: function () {
    return this._handle.playingStateGetter()
  },
  set: function (val) {
    throw new Error('the property playing is readonly')
  }
})

/**
 * @member {number} duration
 * @memberof @yoda/multimedia~MediaPlayer
 */
Object.defineProperty(MediaPlayer.prototype, 'duration', {
  get: function () {
    return this._handle.durationGetter()
  },
  set: function (val) {
    throw new Error('the property duration is readonly')
  }
})

/**
 * @member {number} position
 * @memberof @yoda/multimedia~MediaPlayer
 */
Object.defineProperty(MediaPlayer.prototype, 'position', {
  get: function () {
    return this._handle.positionGetter()
  },
  set: function (val) {
    throw new Error('the property position is readonly')
  }
})

/**
 * @member {boolean} loopMode
 * @memberof @yoda/multimedia~MediaPlayer
 */
Object.defineProperty(MediaPlayer.prototype, 'loopMode', {
  get: function () {
    return this._handle.loopModeGetter()
  },
  set: function (mode) {
    return this._handle.loopModeSetter(mode)
  }
})

/**
 * @member {string} sessionId
 * @memberof @yoda/multimedia~MediaPlayer
 */
Object.defineProperty(MediaPlayer.prototype, 'sessionId', {
  get: function () {
    return this._handle.sessionIdGetter()
  },
  set: function (id) {
    return this._handle.sessionIdSetter(id)
  }
})

/**
 * @member {number} eqMode
 * @memberof @yoda/multimedia~MediaPlayer
 */
Object.defineProperty(MediaPlayer.prototype, 'eqMode', {
  get: function () {
    return this._handle.eqModeGetter()
  },
  set: function (mode) {
    return this._handle.eqModeSetter(mode)
  }
})

module.exports = MediaPlayer
