'use strict';

var prop = require('property');
var keys = {
  'init'          : 'time.init',
  'started'       : 'time.started',
  'voice coming'  : 'time.voice.coming',
  'voice awake'   : 'time.voice.awake',
};

function stub(name) {
  var key = keys[name];
  if (key) {
    prop.set(key, Date.now());
  }
}
exports.stub = stub;
