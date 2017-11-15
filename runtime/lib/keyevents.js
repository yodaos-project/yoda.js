'use strict';
const volume = require('@rokid/volume');
const Player = require('@rokid/player').Player;
const keyPlayer = new Player({
  autoStop: false
});

exports.onPressVolumeUp = function() {
  keyPlayer.seek(0);
  keyPlayer.play(__dirname + '/sounds/volume.ogg');
};

exports.afterPressVolumeUp = function() {
  volume.volumeUp();
};

exports.onPressVolumeDown = function() {
  keyPlayer.seek(0);
  keyPlayer.play(__dirname + '/sounds/volume.ogg');
};

exports.afterPressVolumeDown = function() {
  volume.volumeDown();
};

exports.onPressVolumeMute = function() {
  // TODO
};

exports.afterPressVolumeMute = function() {
  // TODO
};