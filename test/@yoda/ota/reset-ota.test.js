'use strict'

var test = require('tape')
var fs = require('fs')

var ota = require('@yoda/ota')
var upgradeDir = require('./mock').upgradeDir

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

test('if files existed，resetOta result should be ok', t => {
  t.plan(2)
  // writefile into /data/upgrade info.json
  fs.writeFile(infoFile, JSON.stringify(info), () => {
    fs.writeFile(imageFile, JSON.stringify(info), () => {
      ota.resetOta(() => {
        ota.readInfo((_, info) => {
          t.ok(info == null)
          fs.stat(imageFile, (_, stat) => {
            t.ok(stat == null)
            t.end()
          })
        })
      })
    })
  })
})

test('if files not existed，resetOta result should be ok', t => {
  t.plan(2)
  ota.resetOta(() => {
    ota.resetOta((err) => {
      t.ok(err == null)
      fs.stat(imageFile, (_, stat) => {
        t.ok(stat == null)
        t.end()
      })
    })
  })
})
