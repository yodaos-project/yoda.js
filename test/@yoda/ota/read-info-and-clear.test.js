'use strict'

var logger = require('logger')('readInfo.test')
var test = require('tape')
var fs = require('fs')

var ota = require('@yoda/ota')
var upgradeDir = require('./mock').upgradeDir

var infoFile = upgradeDir + '/info.json'
var info = {imageUrl: '/test/test',
  authorize: '',
  changelog: 'yyyyyy',
  checksum: 'cbdakbcabcka',
  isForceUpdate: false,
  version: '111111',
  imagePath: '/data/yc/test',
  status: 'downloaded'
}

test('after readInfoAndClear the info should be readInfoAndClear success', t => {
  t.plan(2)
  // writefile into /data/upgrade info.json
  fs.writeFile(infoFile, JSON.stringify(info), () => {
    ota.readInfoAndClear((err, info) => {
      if (err == null) {
        ota.readInfoAndClear((err, info) => {
          t.ok(err === null, 'null should be nil')
          t.ok(info === null, 'info should be nil')
        })
      }
    })
  })
})

test('after readInfoAndClear the info should be null', t => {
  t.plan(1)
  // writefile into /data/upgrade info.json
  fs.writeFile(infoFile, JSON.stringify(info), () => {
    ota.readInfoAndClear((err, info) => {
      if (err == null) {
        logger.info('null========')
      } else {
        logger.info('not null========')
      }
      ota.readInfo((_, info) => {
        if (info === null) {
          t.pass('info is delete success')
          t.end()
        } else {
          t.fail('there is a error ,the info.json is fail to delete')
          t.end()
        }
      })
    })
  })
})
