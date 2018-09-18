'use strict'

var logger = require('logger')('cleanImages.test')
var test = require('tape')
var ota = require('@yoda/ota')
var fs = require('fs')
var upgradeDir = '/data/upgrade'
var infoFile = upgradeDir + '/info.json'
var imageFile = upgradeDir + '/yctest.img'
var info = {imageUrl: '/test/test',
  authorize: '',
  changelog: 'yyyyyy',
  checksum: 'cbdakbcabcka',
  isForceUpdate: false,
  version: '111111',
  imagePath: '/data/yc/test',
  status: 'downloaded'
}

test('if files not existed ,cleanImages result should  be ok', t => {
  t.plan(2)
  ota.cleanImages(_ => {
    ota.cleanImages(err => {
      t.ok(err == null)
      fs.stat(imageFile, (_, stat) => {
        t.ok(stat == null)
        t.end()
      })
    })
  })
})

test('if files existed ,cleanImages result should  be ok', t => {
  t.plan(2)
  // writefile into /data/upgrade info.json
  fs.writeFile(infoFile, JSON.stringify(info), () => {
    fs.writeFile(imageFile, JSON.stringify(info), () => {
      ota.cleanImages(err => {
        if (err == null) {
          logger.info('null===========')
        } else {
          logger.info('not null============')
        }
        ota.readInfo((_, info) => {
          if (info !== null) {
            logger.info('info not null===========')
          } else {
            logger.info('info null============')
          }
          t.ok(info !== null)
          fs.stat(imageFile, (_, stat) => {
            t.ok(stat == null)
            t.end()
          })
        })
      })
    })
  })
})
