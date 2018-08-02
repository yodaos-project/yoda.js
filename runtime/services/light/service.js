var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var logger = console;

function Light(options) {
  this.playerHandle = {};
  this.duration = 130;
  this.handle = {};
  this.opened = false;
  this.loading = false;
  this.pos = -1;
  this.options = options;
  this.ledConfig = this.options.light.getProfile();
  this.buffer = new Buffer(this.ledConfig.leds * 3);
  // this.fps = this.ledConfig.maximumFps || 30;
  this.fps = 4;
  this.color = {
    degree: {
      r: 255,
      g: 255,
      b: 255
    },
    wakeup: {
      r: 30,
      g: 30,
      b: 255
    }
  };
  this.init();
}

Light.prototype.init = function () {
  this.player = new this.options.soundplayer('sudo');
  this.options.light.enable();
  this.buffer.fill(0);
  this.options.light.write(this.buffer);
};

Light.prototype.setAwake = function () {
  this.pos = -1;
  clearTimeout(this.handle.awake);
  this.opened = true;
  this.transition('b', 0, 150, this.duration, this.fps);
  this.handle.awake = setTimeout(() => {
    this.opened = true;
    this.transition('b', 150, 0, this.duration, this.fps, () => {
      this.pos = -1;
      this.opened = false;
      this.buffer.fill(0);
      this.options.light.write(this.buffer);
    });
  }, 6000);
};

Light.prototype.setDegree = function (degree) {
  if (!this.opened) {
    return;
  }
  degree = degree % 360;
  this.pos = Math.floor((degree / 360) * this.ledConfig.leds);
  this.lightDegree(this.pos);
  this.options.light.write(this.buffer);
  this.sound('wakeup.ogg');
};

Light.prototype.setHide = function () {
  clearTimeout(this.handle.awake);
  clearTimeout(this.handle.transition);
  if (this.loading) {
    this.opened = false;
    clearTimeout(this.handle.loading);
    clearTimeout(this.handle.unsetLoading);
    this.buffer.fill(0);
    this.options.light.write(this.buffer);
    this.loading = false;
  } else if (this.opened) {
    this.transition('b', 150, 0, this.duration, this.fps, () => {
      this.pos = -1;
      this.opened = false;
      this.buffer.fill(0);
      this.options.light.write(this.buffer);
    });
  }
};

Light.prototype.setLoading = function () {
  var self = this;
  console.log('pos', this.pos);
  if (this.pos > -1) {
    var pos = this.pos;
    var render = function () {
      self.fill(self.color.wakeup.r, self.color.wakeup.g, self.color.wakeup.b);
      // self.buffer.fill(0);
      self.pixel(pos, self.color.degree.r, self.color.degree.g, self.color.degree.b);
      self.render(self.buffer);
      pos = pos === 11 ? 0 : pos + 1;
      self.handle.loading = setTimeout(() => {
        render();
      }, 60);
    };
    clearTimeout(this.handle.awake);
    this.loading = true;
    render();
    this.handle.unsetLoading = setTimeout(() => {
      this.setHide();
    }, 6000);
  }
};

Light.prototype.setStandby = function () {
  this.appSound('@network', 'wifi/setup_network.ogg');
};

Light.prototype.lightDegree = function (pos) {
  this.buffer.writeUInt8(this.color.degree.r, pos * 3);
  this.buffer.writeUInt8(this.color.degree.g, pos * 3 + 1);
  this.buffer.writeUInt8(this.color.degree.b, pos * 3 + 2);
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
  self.buffer.fill(30);
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
    // pos = pos === 0 ? 11 : pos - 1;
    // this.buffer.writeUInt8(Math.floor(r * 0.05), 0 + pos * 3);
    // this.buffer.writeUInt8(Math.floor(g * 0.05), 1 + pos * 3);
    // this.buffer.writeUInt8(Math.floor(b * 0.05), 2 + pos * 3);
  }
};

Light.prototype.render = function (buffer) {
  this.options.light.write(buffer);
};

var init = false;
Light.prototype.sound = function (name) {
  var base = '/usr/lua/applications/activation/res/';
  if (!init) {
    this.player.play(base + name);
    init = true;
  } else {
    this.player.seek(0);
  }
};

Light.prototype.appSound = function (appId, name) {
  var base = '/usr/lua/applications/activation/res/';
  if (this.playerHandle[appId]) {
    this.playerHandle[appId].stop();
  }
  var player = new this.options.soundplayer();
  this.playerHandle[appId] = player;
  player.play(base + name);
};

module.exports = Light;