'use strict';

const assert = require('assert');
const tts = require('@rokid/tts');

tts.say('你好', (err) => {
  assert.equal(err, null);
});

tts.say('hello', (err) => {
  assert.equal(err, null);
  process.exit();
});
