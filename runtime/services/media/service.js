var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var logger = console;

function MultiMedia(options) {
  this.handle = {};
  this.options = options;
}

MultiMedia.prototype.play = function (appId, url) {
  return new Promise((resolve, reject) => {
    this.options.permit.invoke('check', [appId, 'ACCESS_MULTIMEDIA'])
      .then((res) => {
        logger.log('multimedia play', res, appId, url);
        if (res['0'] === 'true') {
          this.options.multimedia.play(url);
          // var req = this.options.tts.speak(text);
          // this.handle[appId] = req;
          resolve();
        } else {
          reject('permission deny');
        }
      })
      .catch((err) => {
        logger.log('multimedia play error', appId, url, err);
        reject('can not connect to vui');
      });
  });
};

MultiMedia.prototype.cancel = function (appId) {
  if (this.handle[appId]) {
    this.handle[appId].cancel();
  }
};

module.exports = MultiMedia;