// var EventEmitter = require('events').EventEmitter;
// var inherits = require('util').inherits;
var logger = require('logger')('lightService');

var MEDIA_SOURCE = '/opt/media/';
var LIGHT_SOURCE = '/opt/light/';

var setAwake = require(`${LIGHT_SOURCE}awake.js`);

function Light(options) {
  this.playerHandle = {};
  this.options = options;
  this.prev = null;
  this.init();
}

Light.prototype.init = function () {
  // TODO
};

Light.prototype.stopPrev = function (keep) {
  if (this.prev) {
    if (typeof this.prev === 'function') {
      this.prev(keep);
    } else if (this.prev && typeof this.prev.stop === 'function') {
      this.prev.stop(keep);
    }
    this.prev = null;
  }
};

Light.prototype.loadfile = function (uri, data) {
  var handle;
  try {
    handle = require(uri);
    this.stopPrev();
    this.prev = handle(this.options.effect, data || {});
  } catch (error) {
    logger.error(`load effect file error from path: ${uri}`);
    return false;
  }
  return true;
};

Light.prototype.setAwake = function () {
  this.stopPrev();
  this.prev = setAwake(this.options.effect);
  this.prev.name = 'setAwake';
};

Light.prototype.setDegree = function (degree) {
  if (this.prev && this.prev.name === 'setAwake') {
    this.degree = +degree;
    this.prev.setDegree(+degree);
  }
};

Light.prototype.setHide = function () {
  this.stopPrev();
  this.options.effect.clear();
  this.options.effect.render();
};

Light.prototype.setLoading = function () {
  if (this.prev) {
    if (typeof this.prev === 'object' && this.prev.name === 'setAwake') {
      this.stopPrev(true);
    } else {
      this.stopPrev();
    }
  }
  var hook = require(`${LIGHT_SOURCE}loading.js`);
  this.prev = hook(this.options.effect, {
    degree: this.degree || 0
  });
};

Light.prototype.setStandby = function () {
  this.stopPrev();
  var hook = require(`${LIGHT_SOURCE}setStandby.js`);
  this.prev = hook(this.options.effect);
};

Light.prototype.setVolume = function (volume) {
  if (this.prev) {
    if (typeof this.prev === 'object' && this.prev.name === 'setVolume') {
      this.stopPrev(true);
    } else {
      this.stopPrev();
    }
  }
  var hook = require(`${LIGHT_SOURCE}setVolume.js`);
  this.prev = hook(this.options.effect, {
    volume: +volume
  });
  this.prev.name = 'setVolume';
};

Light.prototype.setConfigFree = function () {
  this.stopPrev();
  this.options.effect.stop();
  this.options.effect.clear();
  this.options.effect.render();
};

Light.prototype.setWelcome = function () {
  this.stopPrev();
  var hook = require(`${LIGHT_SOURCE}setWelcome.js`);
  this.prev = hook(this.options.effect);
};

Light.prototype.appSound = function (appId, name) {
  if (this.playerHandle[appId]) {
    this.playerHandle[appId].stop();
  }
  var player = this.options.effect.sound(name);
  this.playerHandle[appId] = player;
};

module.exports = Light;