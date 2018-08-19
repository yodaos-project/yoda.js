'use strict'

var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var logger = require('logger')('ttsdService');

function Tts(options) {
  this.handle = {};
  this.options = options;
}

Tts.prototype.speak = function (appId, text) {
  return new Promise((resolve, reject) => {
    this.options.permit.invoke('check', [appId, 'ACCESS_TTS'])
      .then((res) => {
        logger.log('ttsd say', res, appId, text);
        if (res['0'] === 'true') {
          var req;
          req = this.options.tts.speak(text);
          if (this.handle[appId]) {
            setTimeout(() => {
              this.handle[appId].stop();
              delete this.handle[appId];
              this.handle[appId] = req;
            }, 0);
          } else {
            this.handle[appId] = req;
          }
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

Tts.prototype.stop = function (appId) {
  if (this.handle[appId]) {
    this.handle[appId].stop();
    delete this.handle[appId];
  }
};

module.exports = Tts;