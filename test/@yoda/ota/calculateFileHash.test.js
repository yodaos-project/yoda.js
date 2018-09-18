'use strict'

var test = require('tape')
var ota = require('@yoda/ota')
var fs = require('fs')
var upgradeDir = '/data/upgrade'
var imageFile = upgradeDir + '/yctest.img'
var info = {
  imageUrl: '/test/test',
  authorize: '',
  changelog: 'yyyyyy',
  checksum: '352da9ad151f8ecf7981cc7fa5c50724',
  isForceUpdate: false,
  version: '111111',
  imagePath: '/data/yc/test',
  status: 'downloaded'
}

test('calculateFileHash should be ok', t => {
  t.plan(1)
  fs.writeFile(imageFile, JSON.stringify(info), () => {
    fs.stat(imageFile, (_, stat) => {
      ota.calculateFileHash(imageFile, (_, hash) => {
        t.equal(hash, '401208ad792c1be1426055cd9d0b8081')
        t.end()
      })
    })
  })
})
