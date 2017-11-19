'use strict';
const volume = require('@rokid/volume');
const Player = require('@rokid/player').Player;
const sounder = new Player({
  autoStop: false
});

/**
 * @module keyevents
 */
module.exports = {

  /**
   * @method keyup
   */
  keyup() {
    sounder.seek(0);
    sounder.play(`${__dirname}/sounds/volume.ogg`);
  },

  /**
   * @method keydown
   */
  keydown() {
    // TODO
  },

  /**
   * @method volumeup
   */
  volumeup() {
    volume.volumeUp();
  },

  /**
   * @method volumedown
   */
  volumedown() {
    volume.volumeDown();
  },

  /**
   * @method mute
   */
  mute() {
    // TODO
  },

};