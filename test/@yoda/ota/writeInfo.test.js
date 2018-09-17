'use strict'

var logger = require('logger')('readInfo.test')
var test = require('tape')
var ota = require('@yoda/ota')
var fs = require('fs')
var upgradeDir = '/data/upgrade'
var infoFile = upgradeDir + '/info.json'
var info = {imageUrl:'/test/test',
  authorize:'',
  changelog:'yyyyyy',
  checksum:'cbdakbcabcka',
  isForceUpdate:false,
  version:'111111',
  imagePath:'/data/yc/test',
  status:'downloaded'
}

test('Info should not null,if writeInfo works', t => {
  t.plan(4)
  // 将文件信息写入info.json
  ota.readInfoAndClear(err=>{
    ota.writeInfo(info, err =>{
      ota.readInfo((err,info) => {
        if(info !== null){
          t.equal(info.checksum,'cbdakbcabcka')
          t.equal(info.version,'111111')
          t.equal(info.imageUrl,'/test/test')
          t.pass('info should not be null')
          t.end()
        }else{
          t.fail('there is a error,info should not be null')
          t.end()
        }
      })
    })
  })
})

test('Info re write should be ok', t => {
  t.plan(4)
  // 将文件信息写入info.json
  ota.writeInfo(info,err=>{
    ota.writeInfo(info, err =>{
      ota.readInfo((err,info) => {
        if(info !== null){
          t.equal(info.checksum,'cbdakbcabcka')
          t.equal(info.version,'111111')
          t.equal(info.imageUrl,'/test/test')
          t.pass('info should not be null')
          t.end()
        }else{
          t.fail('there is a error,info should not be null')
          t.end()
        }
      })
    })
  })
})
