'use strict';

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
var players = [];

/**
 * @class Player
 * @extends EventEmitter
 */
class Player extends EventEmitter {
  /**
   * @method constructor
   */
  constructor() {
    super();
    this._onPrepared = null;
    this._state = null;
    this._handle = new PlayWrap((id) => {
      this._state = names[id];
      this.emit(this._state);
      if (this._state === 'prepared') {
        if (typeof this._onPrepared === 'function')
          this._onPrepared();
        else
          this._handle.start();
      } else if (this._state === 'finish') {
        this._handle.stop();
      }
    });
    this.on('error', this._onError.bind(this));
    players.push(this);
  }
  /**
   * @method _onError
   */
  _onError(err) {
    console.error('Error: player occurrs some unknown error');
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

function play(url, setup) {
  stop();
  var newInstance = new Player();
  if (typeof setup === 'function')
    setup(newInstance);
  newInstance.play(url);
  console.log('play', url);
  tap.assert('media.play', url);

  defaultPlayer = newInstance;
  return defaultPlayer;
}

function stop() {
  for (let i = 0; i < players.length; i++) {
    players[i].stop();
    delete players[i];
  }
  players.length = 0;
  defaultPlayer = null;
  tap.assert('media.stop', true);
}

function pause() {
  for (let i = 0; i < players.length; i++) {
    players[i].pause();
  }
  tap.assert('media.pause', true);
}

function resume() {
  for (let i = 0; i < players.length; i++) {
    players[i].resume();
  }
  tap.assert('media.resume', true);
}

exports.Player = Player;
exports.play = play;
exports.stop = stop;
exports.pause = pause;
exports.resume = resume;
