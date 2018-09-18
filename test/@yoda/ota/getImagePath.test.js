'use strict'

var logger = require('logger')('getImagePath.test')
var test = require('tape')
var ota = require('@yoda/ota')
var info = {
  imageUrl: 'https://example.com',
  version: 'foobar',
  checksum: '99d7bdf3ecf03f3fd081d7b835c7347f'
}

test('get imagePath should be ok', t => {
  t.plan(1)
  var imagePath = ota.getImagePath(info)
  t.ok(imagePath !== null)
  logger.log('=========' + imagePath + '========')
  t.end()
})
