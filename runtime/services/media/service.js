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
          logger.log('playing ->', this.options.multimedia.playing);
          if (this.options.multimedia.playing) {
            this.options.multimedia.stop();
          }
          this.options.multimedia.play(url);
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
  if (this.options.multimedia.playing) {
    this.options.multimedia.stop();
  }
};

module.exports = MultiMedia;