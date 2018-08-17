// var EventEmitter = require('events').EventEmitter;
// var inherits = require('util').inherits;
var logger = require('logger')('lightService');

var MEDIA_SOURCE = '/opt/media/';
var LIGHT_SOURCE = '/opt/light/';

var setAwake = require(`${LIGHT_SOURCE}awake.js`);

function Light(options) {
  this.options = options;
  this.prev;
  this.init();
}

Light.prototype.init = function () {

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
  clearTimeout(this.handle.circleAnimation);
  clearTimeout(this.handle.circleBreathing);
  this.buffer.fill(0);
  this.render(this.buffer);
};

Light.prototype.circleAnimation = function (r, g, b, interval, fps) {
  var self = this;
  var index = 0;
  var circle = function (pos, r, g, b) {
    self.breathing(pos, r, g, b, interval, fps, () => {
      index = index === 2 ? 0 : index + 1;
      self.handle.circleAnimation = setTimeout(() => {
        circle(index, r, g, b);
      }, 15);
    });
  }
  circle(index, r, g, b);
};

Light.prototype.breathing = function (pos, or, og, ob, duration, fps, cb) {
  var self = this;
  var times = Math.floor(duration / fps / 2);
  var stepR = Math.floor(or / fps);
  var stepG = Math.floor(og / fps);
  var stepB = Math.floor(ob / fps);
  var colorR = 0;
  var colorG = 0;
  var colorB = 0;
  var render = function (r, g, b) {
    self.buffer.fill(0);
    self.pixel(pos, r, g, b);
    self.pixel(pos + 3, r, g, b);
    self.pixel(pos + 6, r, g, b);
    self.pixel(pos + 9, r, g, b);
    self.render(self.buffer);
    if (stepR <= 0 && r === 0) {
      cb();
      return;
    }

    colorR += stepR;
    colorG += stepG;
    colorB += stepB;
    if (stepR > 0) {
      colorR = colorR > or ? or : colorR;
      colorG = colorG > og ? og : colorG;
      colorB = colorB > ob ? ob : colorB;
    } else {
      colorR = colorR < 0 ? 0 : colorR;
      colorG = colorG < 0 ? 0 : colorG;
      colorB = colorB < 0 ? 0 : colorB;
    }
    if (colorR >= or) {
      stepR = -stepR;
      stepG = - stepG;
      stepB = - stepB;
    }
    self.handle.circleBreathing = setTimeout(() => {
      render(colorR, colorG, colorB);
    }, times);
  };
  render(colorR, colorG, colorB);
};

Light.prototype.lightDegree = function (pos) {
  this.buffer.writeUInt8(this.color.degree.r, pos * 3);
  this.buffer.writeUInt8(this.color.degree.g, pos * 3 + 1);
  this.buffer.writeUInt8(this.color.degree.b, pos * 3 + 2);
};

Light.prototype.setWelcome = function () {
  var rand = Math.round(Math.random() * 2);
  this.appSound('@YodaOS', `${MEDIA_SOURCE}startup${rand}.ogg`);
  setTimeout(() => {
    this.transition('b', 0, 255, 2400, 80, () => {
      setTimeout(() => {
        this.transition('b', 255, 0, 1000, 30);
      }, 1000);
    });
  }, 1400);
};

Light.prototype.transition = function (pass, from, to, duration, fps, cb) {
  clearTimeout(this.handle.transition);
  pass = {
    'r': 1,
    'g': 2,
    'b': 3
  }[pass] || 3;
  var times = Math.floor(duration / fps);
  var step = Math.floor((to - from) / fps);
  var left = fps;
  var self = this;
  logger.log('duration ' + duration + ' fps ' + fps + ' times ' + times + ' step ' + step + ' from ' + from + ' to ' + to);
  function render(color) {
    if (step >= 0) {
      color = color > to ? to : color;
    } else {
      color = color < to ? to : color;
    }
    // logger.log('color --> ' + color);
    for (var i = 0; i < self.ledConfig.leds; i++) {
      self.buffer.writeUInt8(color, pass - 1 + i * 3);
    }
    if (self.pos > -1) {
      self.lightDegree(self.pos);
    }
    self.options.light.write(self.buffer);
    if (left > 0) {
      left--;
      self.handle.transition = setTimeout(() => {
        render(color + step);
      }, times);
    } else {
      cb && cb();
    }
  }
  // self.buffer.fill(30);
  render(from);
};

Light.prototype.fill = function (r, g, b) {
  for (var i = 0; i < this.ledConfig.leds; i++) {
    this.buffer.writeUInt8(r, 0 + i * 3);
    this.buffer.writeUInt8(g, 1 + i * 3);
    this.buffer.writeUInt8(b, 2 + i * 3);
  }
};

Light.prototype.pixel = function (pos, r, g, b, shading) {
  this.buffer.writeUInt8(r, 0 + pos * 3);
  this.buffer.writeUInt8(g, 1 + pos * 3);
  this.buffer.writeUInt8(b, 2 + pos * 3);
  if (shading) {
    pos = pos === 0 ? 11 : pos - 1;
    this.buffer.writeUInt8(Math.floor(r * 0.3), 0 + pos * 3);
    this.buffer.writeUInt8(Math.floor(g * 0.3), 1 + pos * 3);
    this.buffer.writeUInt8(Math.floor(b * 0.3), 2 + pos * 3);
    pos = pos === 0 ? 11 : pos - 1;
    this.buffer.writeUInt8(Math.floor(r * 0.1), 0 + pos * 3);
    this.buffer.writeUInt8(Math.floor(g * 0.1), 1 + pos * 3);
    this.buffer.writeUInt8(Math.floor(b * 0.1), 2 + pos * 3);
  }
};

Light.prototype.render = function (buffer) {
  this.options.light.write(buffer);
};

var init = false;
Light.prototype.wakeupSound = function () {
  if (!init) {
    this.player.play(`${MEDIA_SOURCE}wakeup.ogg`);
    init = true;
  } else {
    this.player.seek(0);
  }
};

Light.prototype.appSound = function (appId, name) {
  if (this.playerHandle[appId]) {
    this.playerHandle[appId].stop();
  }
  var player = new this.options.soundplayer();
  this.playerHandle[appId] = player;
  player.play(name);
};

module.exports = Light;