'use strict';

var test = require('tape');
var wifi = require('wifi');

test('simple wifi', function(t) {
  t.equal(typeof wifi.getWifiState(), 'number');
  t.equal(typeof wifi.getNetworkState(), 'number');
  t.end();
});
