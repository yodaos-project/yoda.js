'use strict';

// setInterval(() => {
//   console.log(123);
// }, 1000);

const LumenWrap = require('bindings')('lumen.node').LumenWrap;
const LumenLayer = require('./layer').LumenLayer;
let shouldStartRender = false;

/**
 * @class LumenRuntime
 */
class LumenRuntime {
  /**
   * @method constructor
   */
  constructor() {
    this._lumen = new LumenWrap();
    this.count = this._lumen.ledCount;
    // this.fps = this._lumen.fps;
    this.fps = 35;
    this.speed = 1;
    this.layers = [];
    this.last = [];
    this.backgroundLayer = null;
    this.init();
  }
  /**
   * @method init
   */
  init() {
    this.backgroundLayer = this.createLayer('*', {
      group: 'background',
      fill: 'black',
    });
    this.start();
  }
  /**
   * @method start
   */
  start() {
    this._lumen.start();
    this._bus = setInterval(() => {
      const result = this.mergeLayers();
      if (result && shouldStartRender) {
        this._lumen.draw(result);
      }
    }, this.fps);
  }
  /**
   * @method stop
   */
  stop() {
    clearInterval(this._bus);
  }
  /**
   * @method rest
   */
  rest() {
    this.removeAllLayers();
    if (this.backgroundLayer) {
      this.backgroundLayer.fill('black');
    }
  }
  /**
   * @method setSpeed
   * @param {Number} speed
   */
  setSpeed(speed) {
    this.speed = speed;
  }
  /**
   * @method createLayer
   * @param {Array} leds
   * @param {Object} options
   */
  createLayer(leds, options) {
    if (leds === '*') {
      leds = [];
      for (let i = 0; i < this.count; i++) {
        leds.push(i);
      }
    }
    if (this.layers.length > 0) {
      shouldStartRender = true;
    }
    const layer = new LumenLayer(this, leds, options || {});
    this.layers.push(layer);
    return layer;
  }
  /**
   * @method removeLayer
   * @param {String} name - the group name to be removed
   */
  removeLayersByGroup(name) {
    console.log(this.layers.map((self) => self.group));
    let newLayers = [];
    for (let i = 0; i < this.layers.length; i++) {
      const item = this.layers[i];
      if (item.group !== name) {
        newLayers.push(item);
      }
    }
    this.layers = newLayers;
    return this.layers;
  }
  /**
   * @method removeAllLayers
   */
  removeAllLayers() {
    let newLayers = [];
    for (let i = 0; i < this.layers.length; i++) {
      const item = this.layers[i];
      if (item.group === 'background') {
        newLayers.push(item);
        break;
      }
    }
    this.layers = newLayers;
  }
  /**
   * @method mergeLayers
   */
  mergeLayers() {
    if (!this.layers.length)
      return false;
    if (this.layers.length === 1) {
      return this.layers[0].onDraw();
    }

    const data = [];
    for (let i = 0; i < this.layers.length; i++) {
      if (!this.layers[i].running) {
        continue;
      }
      const bits = this.layers[i].onDraw();
      for (let j = 0; j < bits.length; j++) {
        if (bits[j]) {
          data[j] = bits[j];
        }
      }
    }
    if (data.length === 0) {
      return false;
    }
    return data;
  }
}

exports.LumenRuntime = LumenRuntime;
