'use strict'

var PlayerWrap = require('./mediaplayer.node').MediaPlayer
var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var AudioManager = require('@yoda/audio').AudioManager
var delegate = require('@yoda/util/delegate')

var handle = Symbol('mediaplayer#native')

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
  this[handle] = new PlayerWrap()
  this._settled = false
  this._preparing = false
  this._startOnPrepared = false
}
inherits(MediaPlayer, EventEmitter)

/**
 * Initialize the media player, set callbacks
 * @private
 */
MediaPlayer.prototype._setup = function () {
  var streamName = AudioManager.getStreamName(this._stream)
  this[handle].setup(streamName, undefined, this._onevent.bind(this))
  this._settled = true
}

var EventMap = {
  /**
   * Prepared event, media resource is loaded
   * @event module:@yoda/multimedia~MediaPlayer#prepared
   */
  1: 'prepared',
  /**
   * Fired when media playback is complete.
   * @event module:@yoda/multimedia~MediaPlayer#playbackcomplete
   */
  2: 'playbackcomplete',
  /**
   * Fired when media buffer is update.
   * @event module:@yoda/multimedia~MediaPlayer#bufferingupdate
   */
  3: 'bufferingupdate',
  /**
   * Fired when media seek is complete.
   * @event module:@yoda/multimedia~MediaPlayer#seekcomplete
   */
  4: 'seekcomplete',
  5: 'position', /** doesn't fire on synchronous call */
  6: 'pause', /** doesn't fire on synchronous call */
  7: 'stopped', /** doesn't fire on synchronous call */
  8: 'playing',
  /**
   * Fired when player is blocked for no cache available to play.
   * @event module:@yoda/multimedia~MediaPlayer#blockpausemode
   * @param {boolean} enabled
   */
  9: 'blockpausemode',
  10: 'playingstatus',
  /**
   * Fired when something went wrong.
   * @event module:@yoda/multimedia~MediaPlayer#error
   * @type {Error}
   */
  100: 'error',
  200: 'info'
}
MediaPlayer.prototype._onevent = function (type, ext1) {
  var eve = EventMap[type]
  var args = [eve]
  switch (eve) {
    case 'prepared':
      var vol = AudioManager.getVolume(this._stream)
      AudioManager.setVolume(this._stream, vol)
      this._preparing = false
      break
    case 'blockpausemode':
      args.push(ext1 === 0)
      break
    case 'error':
      args.push(new Error('player error'))
      this._settled = false
      this._preparing = false
      break
  }
  this.emit.apply(this, args)

  switch (eve) {
    case 'prepared':
      /** delay until `prepared` had been emitted */
      if (this._startOnPrepared && this._settled) {
        this[handle].start()
      }
      this._startOnPrepared = false
  }
}

delegate(MediaPlayer.prototype, handle)
  .method('pause')
  .method('seekTo')
  .method('reset')
  .method('getAudioSessionId')
  .method('setAudioSessionId')
  .method('getDuration')
  .method('getPosition')
  .method('getPlaying')
  .method('getLooping')
  .method('setLooping')
  .method('setTempoDelta')
  .method('getVolume')
  .method('setVolume')

/**
 * initialize player with given media on the url.
 * @param {string} url
 */
MediaPlayer.prototype.setDataSource = function (url) {
  if (!this._settled) {
    this._setup()
  }
  this[handle].setDataSource(url)
  this.url = url
}

/**
 * prepare the player.
 */
MediaPlayer.prototype.prepare = function (url) {
  if (url) {
    this.setDataSource(url)
  }
  if (this.url && !this._settled) {
    this.setDataSource(this.url)
  }
  this[handle].prepare()
  this._preparing = true
}

/**
 * start playback.
 */
MediaPlayer.prototype.start = function (url) {
  if (url) {
    this.prepare(url)
  }
  if (this._preparing) {
    this._startOnPrepared = true
    return
  }
  return this[handle].start()
}

MediaPlayer.prototype.stop = function () {
  this._settled = false
  this._preparing = false
  this._startOnPrepared = false
  return this[handle].stop()
}

MediaPlayer.prototype.resume = function () {
  return this.start()
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
  return this[handle].setTempoDelta(speed)
}

/**
 * @member {boolean} playing
 * @memberof @yoda/multimedia~MediaPlayer
 */
Object.defineProperty(MediaPlayer.prototype, 'playing', {
  enumerable: true,
  configurable: true,
  get: function () {
    if (!this._settled) {
      return false
    }
    return this[handle].getPlaying()
  }
})

/**
 * @member {number} duration
 * @memberof @yoda/multimedia~MediaPlayer
 */
Object.defineProperty(MediaPlayer.prototype, 'duration', {
  enumerable: true,
  configurable: true,
  get: function () {
    if (!this._settled) {
      return -1
    }
    return this[handle].getDuration()
  }
})

/**
 * @member {number} position
 * @memberof @yoda/multimedia~MediaPlayer
 */
Object.defineProperty(MediaPlayer.prototype, 'position', {
  enumerable: true,
  configurable: true,
  get: function () {
    if (!this._settled) {
      return -1
    }
    return this[handle].getPosition()
  }
})

module.exports = MediaPlayer
