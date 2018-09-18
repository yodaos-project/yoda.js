'use strict'

var logger = require('logger')('getInfoOfPendingUpgrade.test')
var test = require('tape')
var ota = require('@yoda/ota')
var fs = require('fs')
var upgradeDir = '/data/upgrade'
var infoFile = upgradeDir + '/info.json'
var info1 = {
  imageUrl: '/test/test',
  authorize: '',
  changelog: 'yyyyyy',
  checksum: 'cbdakbcabcka',
  isForceUpdate: false,
  version: '111111',
  imagePath: '/data/yc/test',
  status: 'downloaded'
}

var info2 = {
  imageUrl: '/test/test',
  authorize: '',
  changelog: 'yyyyyy',
  checksum: 'cbdakbcabcka',
  isForceUpdate: false,
  version: '111111',
  imagePath: '/data/yc/test',
  status: 'downloading'
}

test('if info .json has downloaded,getInfoOfPendingUpgrade should return null info', t => {
  t.plan(2)
  fs.writeFile(infoFile, JSON.stringify(info1), () => {
    ota.getInfoOfPendingUpgrade((err, info) => {
      if (err) {
        logger.info(err + '==============')
      }
      t.ok(err == null)
      t.ok(info != null)
      t.end()
    })
  })
})

test('if info .json has downloading,getInfoOfPendingUpgrade should return null null', t => {
  t.plan(2)
  fs.writeFile(infoFile, JSON.stringify(info2), () => {
    ota.getInfoOfPendingUpgrade((err, info) => {
      t.ok(err == null)
      t.ok(info == null)
      t.end()
    })
  })
})

test('if info .json not existed,getInfoOfPendingUpgrade should return null null', t => {
  t.plan(2)
  fs.writeFile(infoFile, JSON.stringify(info2), () => {
    fs.unlink(infoFile, () => {
      ota.getInfoOfPendingUpgrade((err, info) => {
        t.ok(err == null)
        t.ok(info == null)
        t.end()
      })
    })
  })
})
