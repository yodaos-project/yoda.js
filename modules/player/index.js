'use strict';

const volume = require('@rokid/volume');
const property = require('@rokid/property');
const PlayWrap = require('bindings')('rplay').PlayWrap;
const EventEmitter = require('events').EventEmitter;
const tap = require('@rokid/tapdriver');
const names = {
  [0]:    'nop',
  [1]:    'prepared',
  [2]:    'finish',
  [3]:    'data',
  [4]:    'seek',
  [100]:  'error',
  [200]:  'info'
};

var defaultPlayer = null;
var volumeInitialized = false;

/**
 * @class Player
 * @extends EventEmitter
 */
class Player extends EventEmitter {
  /**
   * @method constructor
   * @param {Object} options
   * @param {String} options.stream
   * @param {Boolean} options.autoStop
   */
  constructor(options) {
    super();
    this._onPrepared = null;
    this._state = null;
    this._options = options || {};
    // FIXME(Yorkie): currently only support alarm.
    if (this._options.stream === 'alarm') {
      this._handle = new PlayWrap('alarm', this._onCallback.bind(this));
    } else {
      this._handle = new PlayWrap(this._onCallback.bind(this));
    }
    this.on('error', this._onError.bind(this));
  }
  _onCallback(id) {
    if (this._state === 'finish') {
      // if the before state is "finish", we dont handle any other state.
      // just return
      return;
    }
    this._state = names[id];
    this.emit(this._state);
    if (this._state === 'prepared') {
      if (typeof this._onPrepared === 'function')
        this._onPrepared();
      else
        this._handle.start();

      if (volumeInitialized)
        return;

      const expect = property.get('persist.system.volume');
      const actual = {
        tts: volume.getByStream('tts'),
        media: volume.getByStream('media'),
      };
      if (actual.tts !== expect ||
        actual.media !== expect) {
        volume.set(expect);
        volumeInitialized = true;
      }
    } else if (this._state === 'finish') {
      // FIXME(yazhong): `autoStop` means auto stop the handle
      // default is `true`.
      if (this._options && this._options.autoStop === false)
        return;
      this._handle.stop();
    }
  }
  /**
   * @method _onError
   */
  _onError(err) {
    this._handle.stop();
    console.error('Error: player occurrs some unknown error', err);
  }
  /**
   * @method play
   */
  play(url, onPrepared) {
    this._onPrepared = onPrepared;
    this._handle.setDataSource(url);
  }
  /**
   * @method stop
   */
  stop() {
    // FIXME(yazhong): stop me
    // this._handle.resume();
    this._handle.stop();
  }
  /**
   * @method pause
   */
  pause() {
    this._handle.pause();
    this._state = 'paused';
    this.emit('paused');
  }
  /**
   * @method resume
   */
  resume() {
    this._handle.resume();
    this._state = 'prepared';
    this.emit('resume');
  }
  /**
   * @method forward
   */
  forward(ms) {
    this.pause();
    const offset = this.offset + ms;
    if (offset < this.duration) {
      this.seek(offset);
    } else {
      this.seek(duration);
    }
    this.resume();
  }
  /**
   * @method backward
   */
  backward(ms) {
    this.pause();
    const offset = this.offset - ms;
    if (offset <= 0) {
      this.seek(0);
    } else {
      this.seek(offset);
    }
    this.resume();
  }
  /**
   * @method seek
   */
  seek(ms) {
    this._handle.seek(ms);
  }
  /**
   * @property {Number} duration
   */
  get duration() {
    return this._handle.duration;
  }
  /**
   * @property {Number} offset
   */
  get offset() {
    return this._handle.offset;
  }
}

/**
 * @module player
 */
module.exports = {

  /**
   * @method play
   * @param {String} url
   * @param {Function} preprocessor
   * @param {Object} options
   */
  play(url, preprocessor, options) {
    this.stop();
    var newInstance = new Player(options || {});
    if (typeof preprocessor === 'function') {
      preprocessor(newInstance);
    }
    newInstance.play(url);
    tap.assert('media.play', url);
    defaultPlayer = newInstance;
    return defaultPlayer;
  },

  /**
   * @method seek
   * @param {Number} ms
   */
  seek(ms) {
    if (!defaultPlayer)
      return;
    defaultPlayer.seek(ms || 0);
    return defaultPlayer;
  },

  /**
   * @method stop
   */
  stop() {
    if (!defaultPlayer)
      return;
    defaultPlayer.stop();
    defaultPlayer = null;
    return defaultPlayer;
  },


  /**
   * @method pause
   */
  pause() {
    if (!defaultPlayer)
      return;
    defaultPlayer.pause();
    return defaultPlayer;
  },

  /**
   * @method resume
   */
  resume() {
    if (!defaultPlayer)
      return;
    defaultPlayer.resume();
    return defaultPlayer;
  },

  /**
   * @class Player
   */
  Player: Player

};
