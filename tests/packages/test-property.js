'use strict';

var test = require('tape');
var prop = require('property');

test('simple property', function(t) {
  t.plan(1);
  prop.set('test_key', 'foobar');
  t.equal(prop.get('test_key'), 'foobar');
  t.end();
});
