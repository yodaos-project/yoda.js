'use strict';

var test = require('tape');
var login = require('/usr/lib/yoda/runtime/cloudapi/login');

test('login', function(t) {
  var profile = light.getProfile();
  t.equal(typeof profile.leds, 'number');
  t.equal(typeof profile.format, 'number');
  t.equal(typeof profile.maximumFps, 'number');
  t.equal(typeof profile.micAngle, 'number');
  t.end();
});
