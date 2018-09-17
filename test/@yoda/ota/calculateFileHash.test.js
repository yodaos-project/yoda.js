'use strict'

var logger = require('logger')('cleanImages.test')
var test = require('tape')
var ota = require('@yoda/ota')
var fs = require('fs')
var upgradeDir = '/data/upgrade'
var imageUrl = 'https://ota.rokidcdn.com/toB/Mini_A113/RP105rokid_upgrade_package-3.0.5-20180630-185803.img'
var dest = '/data/upgrade/test.img'
var imageSize = 198
var infoFile = upgradeDir + '/info.json'
var imageFile = upgradeDir + '/yctest.img'
var info = {imageUrl:'/test/test',
  authorize:'',
  changelog:'yyyyyy',
  checksum:'352da9ad151f8ecf7981cc7fa5c50724',
  isForceUpdate:false,
  version:'111111',
  imagePath:'/data/yc/test',
  status:'downloaded'
}

test('calculateFileHash should be ok' , t => {
  t.plan(1)
  fs.writeFile(imageFile,JSON.stringify(info) , (err) => {
    fs.stat(imageFile, (err, stat) => {
      ota.calculateFileHash(imageFile, (err,hash) => {
        logger.info(hash+"=====================")
        t.equal(hash,'401208ad792c1be1426055cd9d0b8081')
        t.end()
      })
    })
  })
})


