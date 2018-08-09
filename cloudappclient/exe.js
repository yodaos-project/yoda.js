function directive() {
  this.frontend = [];
  this.background = [];
  this.cb = {
    frontend: {
      tts: function () {},
      media: function () {}
    },
    background: {
      tts: function () {},
      media: function () {}
    }
  };
}

directive.prototype.execute = function execute(dt, type, cb) {
  this[type] = dt || [];
  this.run(type, cb);
  console.log('start run dt');
};

directive.prototype.stop = function (type, cb) {
  this[type] = [];
  var dt = [{
    type: 'tts',
    action: 'cancel',
    data: {}
  }, {
    type: 'media',
    action: 'cancel',
    data: {}
  }];
  this.execute(dt, type, cb);
}

directive.prototype.resume = function (type, cb) {
  this[type] = [];
  var dt = [{
    type: 'media',
    action: 'resume',
    data: {}
  }];
  this.execute(dt, type, cb);
}

directive.prototype.run = function run(type, cb) {
  if (this[type].length <= 0) {
    return;
  }
  var self = this;
  var dt = this[type].shift();
  function handle(next) {
    if (self[type].length > 0) {
      dt = self[type].shift();
    } else {
      dt = {
        type: ''
      };
    }
    if (next.type === 'tts') {
      console.log('run tts ' + type, typeof self.cb[type].tts);
      self.cb[type].tts.call(self, next, function () {
        handle(dt);
      });
    } else if (next.type === 'media') {
      console.log('run media ' + type, typeof self.cb[type].media);
      self.cb[type].media.call(self, next, function () {
        handle(dt);
      });
    } else {
      console.log('all directive complete');
      cb && cb();
    }
  }
  handle(dt);
};

directive.prototype.do = function (type, dt, cb) {
  this.cb[type][dt] = cb;
};

module.exports = directive;
/*
var exe = new directive();

exe.do('frontend', 'tts', function (dt, next) {
  console.log('tts ', dt);
  if (dt.action === 'say') {
    next();
  } else if (dt.action === 'cancel') {
    next();
  }
});

var handle;
exe.do('frontend', 'media', function (dt, next) {
  console.log('media', dt);
  if (dt.action === 'play') {
    handle = setTimeout(() => {
      next();
    }, 3000);
  } else if (dt.action === 'cancel') {
    clearTimeout(handle);
    next();
  }
});



var dt = [{
  type: 'tts',
  action: 'say',
  data: '1'
}, {
  type: 'media',
  action: 'play',
  data: '2'
}, {
  type: 'tts',
  action: 'cancel',
  data: '3'
}, {
  type: 'media',
  action: 'cancel',
  data: '4'
}];


exe.execute(dt, 'frontend');

setTimeout(() => {
  exe.stop('frontend');
}, 2000);
*/