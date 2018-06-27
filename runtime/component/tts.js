var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;

function TTS (permission) {
    EventEmitter.call(this);
    this.permission = permission;
}
inherits(TTS, EventEmitter);

TTS.prototype.say = function(appId, text, cb) {
    if (typeof text === 'string') {
        if (this.permission.check(appId, 'tts')) {
            console.log('tts: ' + text);
            cb(null);
        }else{
            cb(new Error('permission deny'));
        }
    }else{
        cb(new Error('text must be string'));
    }
}

module.exports = TTS;