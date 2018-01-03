'use strict';

const fs = require('fs');
const EventEmitter = require('events').EventEmitter;

let config;
let voiceEventPlugin;

if (fs.existsSync('/data/system/openvoice_profile.json')) {
  config = JSON.parse(fs.readFileSync('/data/system/openvoice_profile.json'));
}

if (fs.existsSync('/data/plugins/EventHandler.js')) {
  voiceEventPlugin = require('/data/plugins/EventHandler.js');
}

module.exports = {
  /**
   * @property config
   */
  get config() {
    if (!config)
      throw new Error('config is exists');
    return config;
  },
  /**
   * @method emitVoiceEvent
   */
  emitVoiceEvent(name, argv) {
    if (voiceEventPlugin && voiceEventPlugin instanceof EventEmitter) {
      voiceEventPlugin.emit(name, argv);
    }
  }
};
