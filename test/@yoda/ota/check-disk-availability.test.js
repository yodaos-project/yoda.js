'use strict'

var logger = require('logger')('cleanImages.test')
var test = require('tape')
var fs = require('fs')
var ota = require('@yoda/ota')
var system = require('@yoda/system')

var upgradeDir = require('./mock').upgradeDir

var imageFile = upgradeDir + '/yctest.img'
var info = {imageUrl: '/test/test',
  authorize: '',
  changelog: 'yyyyyy',
  checksum: '352da9ad151f8ecf7981cc7fa5c50724',
  isForceUpdate: false,
  version: '111111',
  imagePath: '/data/yc/test',
  status: 'downloaded'
}

test('if apace is enough, checkDiskAvailability should be ok', t => {
  t.plan(2)
  fs.writeFile(imageFile, JSON.stringify(info), () => {
    ota.checkDiskAvailability(1234, imageFile, (err) => {
      t.ok(err == null)
      fs.stat(imageFile, (_, stat) => {
        t.ok(stat != null)
        t.end()
      })
    })
  })
})

test('if apace not enough, checkDiskAvailability should delete images', t => {
  t.plan(2)
  fs.writeFile(imageFile, JSON.stringify(info), () => {
    var diskUsage = system.diskUsage(upgradeDir)
    fs.stat(imageFile, function onStat (_, stat) {
      // not enough  5M,should delete img
      var expect = diskUsage.available - 5 * 1024 * 1024 + stat.size + 100
      ota.checkDiskAvailability(expect, imageFile, (err) => {
        t.ok(err == null)
        fs.stat(imageFile, (_, stat) => {
          t.ok(stat == null)
          t.end()
        })
      })
    })
  })
})

test('if apace not enough, even though after delete images,checkDiskAvailability should throw Exception', t => {
  t.plan(2)
  fs.writeFile(imageFile, JSON.stringify(info), () => {
    var diskUsage = system.diskUsage(upgradeDir)
    fs.stat(imageFile, function onStat (_, stat) {
      // not enough  5M,should delete img
      ota.checkDiskAvailability(diskUsage.available, imageFile, err => {
        if (err != null) {
          logger.info('not null==========' + err)
        } else {
          logger.info('null==========')
        }
        t.ok(err != null)
        fs.stat(imageFile, (_, stat) => {
          if (stat == null) {
            logger.info('imageFile null==========')
            t.pass('imageFile null=')
          } else {
            logger.info('imageFile not null==========')
          }
          t.end()
        })
      })
    })
  })
})
