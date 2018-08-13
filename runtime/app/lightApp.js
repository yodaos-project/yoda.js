'use strict'

var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;

function Client(appId, runtime) {
  var self = this;
  EventEmitter.call(this);
  this.runtime = runtime;
  this.appId = appId;
  // 创建隔离的App
  var app = new EventEmitter();
  this.app = app;

  this.on('create', this._onCreate.bind(this));
  this.on('pause', this._onPaused.bind(this));
  this.on('resume', this._onResumed.bind(this));
  this.on('destroy', this._onDestroyed.bind(this));
  this.on('voice_command', this._onVoiceCommand.bind(this));
  this.on('key_event', this._onKeyEvent.bind(this));

  var adapter = new runtime.adapter(runtime.service);
  this.adapter = adapter;

  this.ttsCallback = {};
  adapter.listenTtsdEvent((name, args) => {
    // ttsd的event事件
    if (name === 'ttsdevent') {
      logger.log('ttsevent', args);
      if (typeof this.ttsCallback['ttscb:' + args[0]] === 'function') {
        this.ttsCallback['ttscb:' + args[0]](args[1], args.slice(2));
        // 下面事件完成后不会再触发其它事件，也不应该触发，删除对应cb，防止内存泄漏
        if (args[1] === 'end' || args[1] === 'cancel' || args[1] === 'error') {
          logger.log('unregister', args[0]);
          delete this.ttsCallback['ttscb:' + args[0]];
        }
      }
    }
  }).catch((err) => {
    console.log('ttsd listen error', err);
  });

  this.multiMediaCallback = {};
  adapter.listenMultimediadEvent((name, args) => {
    if (name === 'multimediadevent') {
      logger.log('mediaevent', args);
      if (typeof this.multiMediaCallback['mediacb:' + args[0]] === 'function') {
        this.multiMediaCallback['mediacb:' + args[0]](args[1], args.slice(2));
        if (args[1] === 'end' || args[1] === 'error') {
          logger.log('unregister', args[0]);
          delete this.multiMediaCallback['mediacb:' + args[0]];
        }
      }
    }
  }).catch((err) => {
    console.log('mediad listen error', err);
  });

  //------------------------ 给App注入服务 -------------------------------
  app.getAppId = function () {
    return appId;
  };
  app.exit = function () {
    return self.runtime.exitAppById(appId);
  };
  app.destroyAll = function () {
    return self.runtime.destroyAll();
  };
  app.setPickup = function (isPickup) {
    return self.runtime.setPickup(isPickup === true ? true : false);
  };
  app.mockNLPResponse = function (nlp, action) {
    self._onVoiceCommand(nlp, action);
  };
  // tts module
  app.tts = {
    say: function (text, cb) {
      self.adapter.ttsMethod('say', [appId, text])
        .then((args) => {
          // 返回的参数是一个数组，按顺序
          logger.log('tts register', args[0]);
          self.ttsCallback['ttscb:' + args[0]] = cb.bind(app);
        })
        .catch((err) => {
          logger.error(err);
        });
    },
    cancel: function (cb) {
      self.adapter.ttsMethod('cancel', [appId])
        .then((args) => {
          cb.call(app, null);
        })
        .catch((err) => {
          cb.call(app, err);
        });
    }
  };
  // media模块
  app.media = {
    play: function (url, cb) {
      self.adapter.multiMediaMethod('play', [appId, url])
        .then((args) => {
          logger.log('media register', args);
          self.multiMediaCallback['mediacb:' + args[0]] = cb.bind(app);
        })
        .catch((err) => {
          logger.error(err);
        });
    },
    pause: function (cb) {
      self.adapter.multiMediaMethod('pause', [appId])
        .then((args) => {
          cb.call(app, null);
        })
        .catch((err) => {
          cb.call(app, null);
        });
    },
    resume: function (cb) {
      self.adapter.multiMediaMethod('resume', [appId])
        .then((args) => {
          cb.call(app, null);
        })
        .catch((err) => {
          cb.call(app, null);
        });
    },
    cancel: function (cb) {
      self.adapter.multiMediaMethod('cancel', [appId])
        .then((args) => {
          cb.call(app, null);
        })
        .catch((err) => {
          cb.call(app, null);
        });
    }
  };
  // light module
  app.light = {
    setStandby: function () {
      return self.adapter.lightMethod('setStandby', [appId]);
    },
    sound: function (name) {
      return self.adapter.lightMethod('appSound', [appId, name]);
    }
  };
}
inherits(Client, EventEmitter);

/**
 * @method _onCreate
 */
Client.prototype._onCreate = function () {
  this.state = 'created';
  this.app.emit('created');
}
/**
 * @method _onPaused
 */
Client.prototype._onPaused = function () {
  this.state = 'paused';
  this.app.emit('paused');
}
/**
 * @method _onResumed
 */
Client.prototype._onResumed = function () {
  this.state = 'resumed';
  this.app.emit('resumed');
}

/**
 * @method _onDestroyed
 */
Client.prototype._onDestroyed = function () {
  this.state = 'destroyed';
  this.app.emit('destroyed');
}
/**
 * @method _onVoiceCommand
 */
Client.prototype._onVoiceCommand = function (nlp, action) {
  this.state = 'voice_command';
  this.app.emit('onrequest', nlp, action);
}
/**
 * @method _onKeyEvent
 */
Client.prototype._onKeyEvent = function () {
  this.app.emit('keyEvent');
}
/**
 * 通知App manager该应用应该被销毁了
 */
Client.prototype.exit = function () {
  this.runtime.exitAppById(this.appId);
}


module.exports = Client;