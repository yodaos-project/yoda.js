'use strict';

var test = require('tape');
var volume = require('volume');

test('set/get volume', function(t) {
  t.plan(1);
  volume.set(100);
  t.equal(volume.get('tts'), -1);
  t.end();
});
