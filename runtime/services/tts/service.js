var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var logger = console;

function Tts(options) {
  this.handle = {};
  this.options = options;
}

Tts.prototype.say = function (appId, text) {
  return new Promise((resolve, reject) => {
    this.options.permit.invoke('check', [appId, 'ACCESS_TTS'])
      .then((res) => {
        logger.log('ttsd say', res, appId, text);
        if (res['0'] === 'true') {
          var req = this.options.tts.speak(text);
          // var req = this.options.tts.speak(text);
          // this.handle[appId] = req;
          resolve(req.id);
        } else {
          reject('permission deny');
        }
      })
      .catch((err) => {
        logger.log('ttsd say error', appId, text, err);
        reject('can not connect to vui');
      });
  });
};

Tts.prototype.cancel = function (appId) {
  if (this.handle[appId]) {
    this.handle[appId].cancel();
  }
};

module.exports = Tts;