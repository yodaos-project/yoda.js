'use strict';

var MEDIA_SOURCE = '/opt/media/';
var init = false;

/**
 * @typedef Color
 * @memberof yodaRT
 * @property {Number} r - the red channel.
 * @property {Number} g - the green channel.
 * @property {Number} b - the blue channel.
 */

/**
 * @memberof yodaRT
 * @constructor
 * @param {light} light - the light instance
 * @param {Object} multimedia
 */
function LightRenderingContext(light, multimedia) {
  this.leds = light;
  this.multimedia = multimedia;
  this.ledsConfig = light.getProfile();
  this.handle = {};
  this.id = 0;
  this.player = new multimedia();
}

/**
 * play sound
 * @param {String} uri - the sound resource uri
 */
LightRenderingContext.prototype.sound = function(name) {
  var len = name.length;
  var absPath = '';
  // etc.. system://path/to/sound.ogg
  if (len > 9 && name.substr(0, 9) === 'system://') {
    absPath = MEDIA_SOURCE + name.substr(9);
  // etc.. self://path/to/sound.ogg
  } else if (len > 7 && name.substr(0, 7) === 'self://') {
    absPath = appHome + '/' + name.substr(7);
  // etc.. path/to/sound.ogg
  } else {
    absPath = name;
  }
  var player = new this.multimedia();
  player.start(absPath);
  return player;
};

/**
 * play wakeup sound
 */
LightRenderingContext.prototype.wakeupSound = function() {
  if (!init) {
    this.player.play(`${MEDIA_SOURCE}wakeup.ogg`);
    init = true;
  } else {
    this.player.seek(0);
  }
};

/**
 * request an animation frame, this will call the function `cb` after `interval`.
 */
LightRenderingContext.prototype.requestAnimationFrame = function(cb, interval) {
  var handle = this.id++;
  this.handle[handle] = setTimeout(() => {
    clearTimeout(this.handle[handle]);
    delete this.handle[handle];
    cb();
  }, interval);
};

/**
 * stop the effect
 */
LightRenderingContext.prototype.stop = function(keep) {
  for (var i in this.handle) {
    clearTimeout(this.handle[i]);
  }
  if (keep !== true) {
    this.clear();
    this.render();
  }
};

/**
 * render the effect.
 */
LightRenderingContext.prototype.render = function() {
  this.leds.write();
};

/**
 * clear the effect.
 */
LightRenderingContext.prototype.clear = function() {
  this.leds.clear();
};

/**
 * write single position.
 */
LightRenderingContext.prototype.pixel = function(pos, r, g, b, a) {
  this.leds.pixel(pos, r, g, b, a);
};

/**
 * write all lights.
 */
LightRenderingContext.prototype.fill = function(r, g, b, a) {
  this.leds.fill(r, g, b, a);
};

/**
 * make a breathing effect.
 */
LightRenderingContext.prototype.breathing = function(pos, or, og, ob, duration, fps, cb) {
  var self = this;
  var transformed = false;
  var times = Math.floor(duration / fps / 2);
  var stepR = or / fps;
  var stepG = og / fps;
  var stepB = ob / fps;
  stepR = (stepR === 0 && or > 0) ? 1 : stepR;
  stepG = (stepG === 0 && og > 0) ? 1 : stepG;
  stepB = (stepB === 0 && ob > 0) ? 1 : stepB;
  var colorR = 0;
  var colorG = 0;
  var colorB = 0;
  var left = fps * 2;
  var render = function (r, g, b) {
    self.clear();
    self.pixel(pos, r, g, b);
    self.pixel(pos + 3, r, g, b);
    self.pixel(pos + 6, r, g, b);
    self.pixel(pos + 9, r, g, b);
    self.render();
    left--;
    if (left <= 0) {
      cb && cb();
      return;
    }
    colorR += stepR;
    colorG += stepG;
    colorB += stepB;
    if (stepR > 0) {
      colorR = colorR > or ? or : colorR;
    } else {
      colorR = colorR < 0 ? 0 : colorR;
    }
    if (stepG > 0) {
      colorG = colorG > og ? og : colorG;
    } else {
      colorG = colorG < 0 ? 0 : colorG;
    }
    if (stepB > 0) {
      colorB = colorB > ob ? ob : colorB;
    } else {
      colorB = colorB < 0 ? 0 : colorB;
    }
    if (left <= fps && !transformed) {
      stepR = -stepR;
      stepG = - stepG;
      stepB = - stepB;
      transformed = true;
    }
    if (left <= 1) {
      colorR = 0;
      colorG = 0;
      colorB = 0;
    }

    self.requestAnimationFrame(() => {
      render(colorR, colorG, colorB);
    }, times);
  };
  render(colorR, colorG, colorB);
};

/**
 * make a transition.
 * @param {yodaRT.Color} from
 * @param {yodaRT.Color} to
 * @param {Number} duration
 * @param {Number} fps
 * @param {Function} cb
 */
LightRenderingContext.prototype.transition = function(from, to, duration, fps, cb) {
  var self = this;
  var times = Math.floor(duration / fps);
  var stepR = (to.r - from.r) / fps;
  var stepG = (to.g - from.g) / fps;
  var stepB = (to.b - from.b) / fps;

  var colorR = from.r;
  var colorG = from.g;
  var colorB = from.b;
  var left = fps;
  var render = function (r, g, b) {
    self.clear();
    for (var i = 0; i < self.ledsConfig.leds; i++) {
      self.pixel(i, r, g, b);
    }

    self.render();
    left--;
    if (left <= 0) {
      cb && cb();
      return;
    }
    colorR += stepR;
    colorG += stepG;
    colorB += stepB;
    if (stepR > 0) {
      colorR = colorR > to.r ? to.r : colorR;
    } else {
      colorR = colorR < to.r ? to.r : colorR;
    }
    if (stepG > 0) {
      colorG = colorG > to.g ? to.g : colorG;
    } else {
      colorG = colorG < to.g ? to.g : colorG;
    }
    if (stepB > 0) {
      colorB = colorB > to.b ? to.b : colorB;
    } else {
      colorB = colorB < to.b ? to.b : colorB;
    }

    if (left <= 1) {
      colorR = to.r;
      colorG = to.g;
      colorB = to.b;
    }

    self.requestAnimationFrame(() => {
      render(colorR, colorG, colorB);
    }, times);
  };
  render(colorR, colorG, colorB);
};

module.exports = LightRenderingContext;