'use strict';

const ColorMaps = require('./colors.json');
let layerIndex = 0;

function getColorChannels(hex) {
  if (ColorMaps[hex]) {
    hex = ColorMaps[hex];
  } else if (hex[0] === '#') {
    hex = hex.slice(1);
  }
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  return [
    255 * Math.pow(r / 255, 1 / 2.2), 
    255 * Math.pow(g / 255, 1 / 2.2), 
    255 * Math.pow(b / 255, 1 / 2.2),
  ];
}

/**
 * @class LumenLayer
 */
class LumenLayer {
  /**
   * @method constructor
   * @param {LumenRuntime} runtime
   * @param {Array} leds
   * @param {Object} options
   * @param {String} options.group
   * @param {Number} options.speed
   * @param {String} options.fill
   */
  constructor(runtime, leds, options) {
    this._id = (layerIndex++);
    this._group = options.group || 'default';
    this._leds = leds;
    this._step = [0, 0, 0];
    this._data = [];
    this._speed = options.speed;
    this._from = getColorChannels('black');
    this._to = getColorChannels('black');
    this._runtime = runtime;
    this._bus = null;
    this._accept = null;
    this._reject = null;

    if (options.fill) {
      this.fill(options.fill);
    }
  }
  /**
   * @getter {Number} id - the layer id.
   */
  get id() {
    return this._id;
  }
  /**
   * @getter {Boolean} running
   */
  get running() {
    return this._bus instanceof Promise;
  }
  /**
   * @getter {String} group
   */
  get group() {
    return this._group;
  }
  /**
   * @setter {String} group
   */
  set group(val) {
    this._group = val;
  }
  /**
   * @method fill
   * @param {String} color
   */
  fill(color) {
    const hex = getColorChannels(color);
    for (let n = 0; n < this._runtime.count; n++) {
      if (this._leds.indexOf(n) !== -1) {
        this._data[n] = hex;
      }
    }
    this._step = [0, 0, 0];
    this._from = hex;
    this._to = hex;
  }
  /**
   * @method fade
   * @param {String} from
   * @param {String} to
   * @param {Number} speed
   */
  fade(from, to, speed) {
    if (this._bus) {
      this._bus = null;
      // this._reject(new Error('an duration is interrupted'));
    }

    const correct = this._runtime.fps * (1 / (speed || this._speed));
    this._from = getColorChannels(from);
    this._to = getColorChannels(to);
    this._step = [
      (this._to[0] - this._from[0]) / correct,
      (this._to[1] - this._from[1]) / correct,
      (this._to[2] - this._from[2]) / correct,
    ];
    return this._bus = new Promise((resolve, reject) => {
      this._accept = resolve;
      this._reject = reject;
    });
  }
  /**
   * @method onDraw
   */
  onDraw() {
    const _from = [
      this._from[0] + this._step[0],
      this._from[1] + this._step[1],
      this._from[2] + this._step[2],
    ];

    if (this._step[0] > 0) {
      if (_from[0] >= this._to[0]) {
        _from[0] = this._to[0];
        this._step[0] = 0;
      }
      if (_from[1] >= this._to[1]) {
        _from[1] = this._to[1];
        this._step[1] = 0;
      }
      if (_from[2] >= this._to[2]) {
        _from[2] = this._to[2];
        this._step[2] = 0;
      }
    } else {
      if (_from[0] <= this._to[0]) {
        _from[0] = this._to[0];
        this._step[0] = 0;
      }
      if (_from[1] <= this._to[1]) {
        _from[1] = this._to[1];
        this._step[1] = 0;
      }
      if (_from[2] <= this._to[2]) {
        _from[2] = this._to[2];
        this._step[2] = 0;
      }
    }

    this._from = _from;
    if (this._bus && !this._step[0] && !this._step[1] && !this._step[2]) {
      this._bus = null;
      this._accept();
    }
    
    for (let n = 0; n < this._runtime.count; n++) {
      if (this._leds.indexOf(n) !== -1) {
        this._data[n] = this._from;
      }
    }
    return this._data;
  }
}

exports.LumenLayer = LumenLayer;
