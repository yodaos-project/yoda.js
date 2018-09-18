'use strict'

var logger = require('logger')('getInfoIfFirstUpgradedBoot.test')
var test = require('tape')
var ota = require('@yoda/ota')
var fs = require('fs')
var upgradeDir = '/data/upgrade'
var infoFile = upgradeDir + '/info.json'
var property = require('@yoda/property')
var systemVersionProp = 'ro.build.version.release'
var localVersion = property.get(systemVersionProp)
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
  version: `${localVersion}`,
  imagePath: '/data/yc/test',
  status: 'downloaded'
}
test('if getInfoIfFirstUpgradedBoot is equal native version，return info', t => {
  t.plan(2)
  var localVersion = property.get(systemVersionProp)
  logger.info(localVersion + 'localVersion=============')
  fs.writeFile(infoFile, JSON.stringify(info2), () => {
    ota.getInfoIfFirstUpgradedBoot((err, info) => {
      t.ok(err == null)
      t.ok(info != null)
      t.end()
    })
  })
})

test('if getInfoIfFirstUpgradedBoot is not equal native version，return null null', t => {
  t.plan(2)
  fs.writeFile(infoFile, JSON.stringify(info1), () => {
    ota.getInfoIfFirstUpgradedBoot((err, info) => {
      t.ok(err == null)
      t.ok(info == null)
      t.end()
    })
  })
})

test('if info notexisted,getInfoIfFirstUpgradedBoot res should be null null', t => {
  t.plan(2)
  fs.writeFile(infoFile, JSON.stringify(info2), () => {
    fs.unlink(infoFile, () => {
      ota.getInfoIfFirstUpgradedBoot((err, info) => {
        t.ok(err == null)
        t.ok(info == null)
        t.end()
      })
    })
  })
})
