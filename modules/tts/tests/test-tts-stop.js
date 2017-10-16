'use strict';

const assert = require('assert');
const tts = require('@rokid/tts');

tts.say('格式规范的制定和架构', (err) => {
  assert.equal(err.message, 'TTS has been canceled');
  process.exit();
});

setTimeout(() => {
  tts.stop();
}, 1500);
