var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;

function Application(options) {
    // 将对象直接展平在this中
    Object.assign(this, {
        beforeCreate: function() {
            return false;
        },
        created: function() {
            // create, restart
            return true;
        },
        paused: function() {
            // pause
            return true;
        },
        resumed: function() {
            // resume
            return true;
        },
        beforeDestroy: function() {
            // stop
            return true;
        },
        destroyed: function() {
            // destroy
            return true;
        },
        onrequest: function() {
            // voice_command or other request
            return true;
        },
        keyEvent: function() {
            // key event
            return true;
        }
    }, options);
}



function Client(appid, runtime, options) {
    var _this = this;
    EventEmitter.call(this);
    this.runtime = runtime;
    this.appid = appid;
    // 创建隔离的App
    this.app = new Application(options);

    this.on('beforeCreate', this._onBeforeCreate.bind(this));
    this.on('create', this._onCreate.bind(this));
    this.on('restart', this._onCreate.bind(this));
    this.on('pause', this._onPaused.bind(this));
    this.on('resume', this._onResumed.bind(this));
    this.on('stop', this._onBeforeDestroy.bind(this));
    this.on('destroy', this._onDestroyed.bind(this));
    this.on('voice_command', this._onVoiceCommand.bind(this));
    this.on('key_event', this._onKeyEvent.bind(this));

    //------------------------ 给App注入服务 -------------------------------
    var tts = this.runtime.tts;
    // tts服务
    this.app.tts = {
        say: function(text, cb) {
            if (typeof text === 'string') {
                tts.say(_this.appid, text, cb);
            }else{
                cb(new Error('text must be string'));
            }
        }
    }
}
inherits(Client, EventEmitter);
/**
   * @method _onBeforeCreate
   */
Client.prototype._onBeforeCreate = function(appid) {
    this.state = 'beforeCreate';
    if (this.app.beforeCreate.apply(this.app, arguments)) {
        this.state = 'beforeCreate OK';
    }
}
/**
 * @method _onCreate
 */
Client.prototype._onCreate = function(context) {
    this.state = 'created';
    this.app.created.apply(this.app, arguments);
}
/**
 * @method _onPaused
 */
Client.prototype._onPaused = function() {
    this.state = 'paused';
    this.app.paused.apply(this.app, arguments);
}
/**
 * @method _onResumed
 */
Client.prototype._onResumed = function() {
    this.state = 'resumed';
    this.app.resumed.apply(this.app, arguments);
}
/**
 * @method _onBeforeDestroy
 */
Client.prototype._onBeforeDestroy = function() {
    this.state = 'beforeDestroy';
    this.app.beforeDestroy.apply(this.app, arguments);
}
/**
 * @method _onDestroyed
 */
Client.prototype._onDestroyed = function() {
    this.state = 'destroyed';
    this.app.destroyed.apply(this.app, arguments);
}
/**
 * @method _onVoiceCommand
 */
Client.prototype._onVoiceCommand = function(nlp, action) {
    this.state = 'voice_command';
    this.app.onrequest.apply(this.app, arguments);
}
/**
 * @method _onKeyEvent
 */
Client.prototype._onKeyEvent = function() {
    this.app.keyEvent.apply(this.app, arguments);
}
/**
 * 通知App manager该应用应该被销毁了
 */
Client.prototype.exit = function () {
    this.runtime.exitAppById(this.appid);
}


module.exports = function(options){
    return function(appid, runtime){
        return new Client(appid, runtime, options);
    }
};
