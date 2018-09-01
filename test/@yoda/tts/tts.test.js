'use strict'

var test = require('tape')
var ttsModule = require('@yoda/tts')
var logger = require('logger')('tts-test')
// var prop = require('@yoda/property')
// var login = require('/usr/lib/yoda/runtime/lib/cloudapi/login')

// login().then((data) => {
//   logger.info(data.deviceId)
//   logger.info(data.deviceTypeId)
//   logger.info(data.key)
//   logger.info(data.secret)
// })

// var options = {
//   key : prop.get('key'),
//   secret : 'sds',
//   deviceId : 'ssds',
//   deviceTypeId : 'sdfaf'
// }

// test('module->tts->test demo', t => {
//   t.plan(1)
//   console.log('deeeeeeemo')
//   t.ok(true)
//   t.end()
// })

test('module->tts->createTts method test case: invalid options params',t => {
  t.plan(2)
  var tts = ttsModule.createTts({deviceId:'xxx',deviceTypeId:'xxx',key:'xxx',secret:'xxx'})
  t.equal(typeof tts, 'object',"TtsProxy is object")
  tts.on('error',(id, err)=>{
    logger.error(id+" err: "+err)
    t.ok(err!=''||err!=null)
  })
  t.end()
})

test('module->tts->createHandle method test case: error options params , get handle is null',t => {
  t.plan(2)
  var handle = ttsModule.createHandle({deviceId:'xxx',deviceTypeId:'xxx',key:'xxx',secret:'xxx'})
  t.equal(typeof handle, 'object',"handle is object")
  t.equal(Object.keys(handle).length, 0,'handle is {}')
  t.end()
})


test('module->tts->createHandle method test case: normal options',t => {
  t.plan(1)
  t.doesNotThrow(()=>{
    ttsModule.createHandle({deviceId:'xxx',deviceTypeId:'xxx',key:'xxx',secret:'xxx'})
  })
  t.end()
})

test('module->tts->createHandle method test case: error options',t => {
  t.plan(14)
  //options is null
  t.throws(()=>{ttsModule.createHandle(null)},"options is required")
  t.throws(()=>{ttsModule.createHandle({})},"options is required")
  //options.deviceId is err
  t.throws(()=>{
    ttsModule.createHandle({deviceId: null, deviceTypeId: 'xxx', key: 'xxx', secret: 'xxx'})
  },"options.deviceId is required")
  t.throws(()=>{
    ttsModule.createHandle({deviceId: '', deviceTypeId: 'xxx', key: 'xxx', secret: 'xxx'})
  },"options.deviceId is required")
  t.throws(()=>{
    ttsModule.createHandle({deviceTypeId: 'xxx', key: 'xxx', secret: 'xxx'})
  },"options.deviceId is required")
  //options.deviceTypeId is null
  t.throws(()=>{
    ttsModule.createHandle({deviceId: 'xxx', deviceTypeId: null, key: 'xxx', secret: 'xxx'})
  },"options.deviceTypeId is required")
  t.throws(()=>{
    ttsModule.createHandle({deviceId: 'xxx', deviceTypeId: '', key: 'xxx', secret: 'xxx'})
  },"options.deviceTypeId is required")
  t.throws(()=>{
    ttsModule.createHandle({deviceId: 'xxx', key: 'xxx', secret: 'xxx'})
  },"options.deviceTypeId is required")
  //options.key is null
  t.throws(()=>{
    ttsModule.createHandle({deviceId: 'xxx', deviceTypeId: 'xxx', key: null, secret: 'xxx'})
  },"options.key is required")
  t.throws(()=>{
    ttsModule.createHandle({deviceId: 'xxx', deviceTypeId: 'xxx', key: '', secret: 'xxx'})
  },"options.key is required")
  t.throws(()=>{
    ttsModule.createHandle({deviceId: 'xxx', deviceTypeId: 'xxx', secret: 'xxx'})
  },"options.key is required")
  //options.secret is null
  t.throws(()=>{
    ttsModule.createHandle({deviceId: 'xxx', deviceTypeId: 'xxx', key: 'xxx', secret: null})
  },"options.secret is required")
  t.throws(()=>{
    ttsModule.createHandle({deviceId: 'xxx', deviceTypeId: 'xxx', key: 'xxx', secret: ''})
  },"options.secret is required")
  t.throws(()=>{
    ttsModule.createHandle({deviceId: 'xxx', deviceTypeId: 'xxx', key: 'xxx'})
  },"options.secret is required")
  t.end()
})
