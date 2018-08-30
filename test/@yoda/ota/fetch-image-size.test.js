'use strict'

var test = require('tape')
var ota = require('@yoda/ota')

var imageUrl = 'https://ota.rokidcdn.com/toB/Mini_A113/RP105rokid_upgrade_package-3.0.5-20180630-185803.img'
var imageSize = 61289860

test.skip('should fetch image size', t => {
  t.plan(2)

  ota.fetchImageSize(imageUrl, (err, size) => {
    t.assert(err == null)
    t.strictEqual(size, imageSize)
    t.end()
  })
})
