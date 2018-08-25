'use strict'

var test = require('tape')
var ota = require('@yoda/ota')
var fs = require('fs')

var imageUrl = 'https://ota.rokidcdn.com/toB/Mini_A113/RP105rokid_upgrade_package-3.0.5-20180630-185803.img'
var dest = '/data/upgrade/test.img'
var imageSize = 61289860

test.skip('should download image', t => {
  t.plan(4)

  ota.doDownloadImage(imageUrl, dest, { noCheckCertificate: true }, err => {
    t.error(err)

    fs.stat(dest, (err, stat) => {
      t.error(err)
      t.assert(stat != null)
      t.strictEqual(stat.size, imageSize)
      t.end()
    })
  })
})
