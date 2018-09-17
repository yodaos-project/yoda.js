'use strict'

var test = require('tape')
var ota = require('@yoda/ota')
var fs = require('fs')
var upgradeDir = '/data/upgrade'
var infoFile = upgradeDir + '/info.json'
var imageFile = upgradeDir + '/yctest.img'
var info = {imageUrl:'/test/test',
  authorize:'',
  changelog:'yyyyyy',
  checksum:'cbdakbcabcka',
  isForceUpdate:false,
  version:'111111',
  imagePath:'/data/yc/test',
  status:'downloaded'
}

test('if files existed，resetOta result should be ok', t => {
    t.plan(2)
  // writefile into /data/upgrade info.json
  fs.writeFile(infoFile,JSON.stringify(info),(err) => {
    fs.writeFile(imageFile,JSON.stringify(info),(err) =>{
      ota.resetOta(err => {
        ota.readInfo((err,info) => {
          t.ok(info == null)
          fs.stat(imageFile, (err, stat) => {
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
  ota.resetOta(err => {
    ota.resetOta(err => {
      t.ok(err == null)
      fs.stat(imageFile, (err, stat) => {
        t.ok(stat == null)
        t.end()
      })
    })
  })
})
