var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var logger = console;

function MultiMedia(options) {
  EventEmitter.call(this);
  this.handle = {};
  this.options = options;
}
inherits(MultiMedia, EventEmitter);

MultiMedia.prototype.play = function (appId, url) {
  return new Promise((resolve, reject) => {
    this.options.permit.invoke('check', [appId, 'ACCESS_MULTIMEDIA'])
      .then((res) => {
        if (res['0'] === 'true') {
          if (this.handle[appId]) {
            this.handle[appId].stop();
          }
          var player = new this.options.multimedia();
          this.listenEvent(player);
          player.play(url);
          this.handle[appId] = player;
          resolve('' + player.id);
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
    this.handle[appId].stop();
  }
};

MultiMedia.prototype.pause = function (appId) {
  if (this.handle[appId]) {
    this.handle[appId].pause();
  }
};

MultiMedia.prototype.resume = function (appId) {
  if (this.handle[appId] && !this.handle[appId].playing) {
    this.handle[appId].resume();
  }
};

MultiMedia.prototype.listenEvent = function (player) {
  player.on('prepared', () => {
    this.emit('prepared', '' + player.id, '' + player.duration, '' + player.position);
  });
  player.on('playbackcomplete', () => {
    this.emit('playbackcomplete', '' + player.id);
  });
  player.on('bufferingupdate', () => {
    this.emit('bufferingupdate', '' + player.id);
  });
  player.on('seekcomplete', () => {
    this.emit('seekcomplete', '' + player.id);
  });
  player.on('error', () => {
    this.emit('error', '' + player.id);
  });
};

module.exports = MultiMedia;