'use strict';

let vui = require('./client/index.js');
vui.SpeechService = require('./speech').SpeechService;
vui.SkillHandler = require('./handler').SkillHandler;
vui.AppManager = require('./app').AppManager;

module.exports = vui;
