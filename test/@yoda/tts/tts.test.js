'use strict'

var test = require('tape')
var ttsModule = require('@yoda/tts')
var logger = require('logger')('tts-test')

test.skip('module->tts->createTts method test case: normal options params', t => {
  t.plan(3)
  var tts = ttsModule.createTts({
    deviceId: '0602041822000129',
    deviceTypeId: '060F941561F24278B8ED71733D7B9507',
    key: 'A5D4350521F84E8C859DD473E043087F',
    secret: '658D918B788B4416AE27389D1189F5B8'
  })
  var request = tts.speak('你好若琪', cb => {
    logger.info('call back')
    logger.info(request)
    t.equal(request.state, 'end', `tts : id=${id} call back`)
  })
  logger.info(request)
  tts.on('start', function(id, errno) {
    t.equal(request.state, 'start', `tts : id=${id} start`)
  })
  tts.on('voice', function(id, errno) {
    logger.info('tts voice', id)
  })
  tts.on('end', function(id, errno) {
    logger.info('tts end', id)
    t.equal(request.state, 'end', `tts : id=${id} end`)
    tts.disconnect()
    t.end()
  })
  tts.on('error', function(id, errno) {
    logger.info('tts error', id)
  })
})

test.skip('module->tts->createTts method testcase :invalid options params', t => {
  t.plan(2)
  var tts = ttsModule.createTts({
    deviceId: 'xxx',
    deviceTypeId: 'xxx',
    key: 'xxx',
    secret: 'xxx'
  })
  t.equal(typeof tts, 'object', 'TtsProxy is object')
  tts.on('error', (id, err) => {
    logger.error(`${id} err: ${err}`)
    t.ok(err !== '' || err !== null)
  })
  setTimeout(() => {
    logger.info('tts disconnect ...')
    tts.disconnect()
    t.end()
  }, 2000)
})

test('module->tts->createHandle method test case: error options params , get handle is null', t => {
  t.plan(2)
  var handle = ttsModule.createHandle({
    deviceId: 'xxx',
    deviceTypeId: 'xxx',
    key: 'xxx',
    secret: 'xxx'
  })
  t.equal(typeof handle, 'object', 'handle is object')
  t.equal(Object.keys(handle).length, 0, 'handle is {}')
  t.end()
})

test('module->tts->createHandle method test case: normal options', t => {
  t.plan(1)
  t.doesNotThrow(() => {
    ttsModule.createHandle({
      deviceId: 'xxx',
      deviceTypeId: 'xxx',
      key: 'xxx',
      secret: 'xxx'
    })
  })
  t.end()
})

test('module->tts->createHandle method test case: error options', t => {
  t.plan(14)
  /**
    options is null
    */
  t.throws(() => {
    ttsModule.createHandle(null)
  }, 'options is required')
  t.throws(() => {
    ttsModule.createHandle({})
  }, 'options is required')
  /**
    options.deviceId is err
    */
  t.throws(() => {
    ttsModule.createHandle({
      deviceId: null,
      deviceTypeId: 'xxx',
      key: 'xxx',
      secret: 'xxx'
    })
  }, 'options.deviceId is required')
  t.throws(() => {
    ttsModule.createHandle({
      deviceId: '',
      deviceTypeId: 'xxx',
      key: 'xxx',
      secret: 'xxx'
    })
  }, 'options.deviceId is required')
  t.throws(() => {
    ttsModule.createHandle({
      deviceTypeId: 'xxx',
      key: 'xxx',
      secret: 'xxx'
    })
  }, 'options.deviceId is required')
  /**
    options.deviceTypeId is null
    */
  t.throws(() => {
    ttsModule.createHandle({
      deviceId: 'xxx',
      deviceTypeId: null,
      key: 'xxx',
      secret: 'xxx'
    })
  }, 'options.deviceTypeId is required')
  t.throws(() => {
    ttsModule.createHandle({
      deviceId: 'xxx',
      deviceTypeId: '',
      key: 'xxx',
      secret: 'xxx'
    })
  }, 'options.deviceTypeId is required')
  t.throws(() => {
    ttsModule.createHandle({
      deviceId: 'xxx',
      key: 'xxx',
      secret: 'xxx'
    })
  }, 'options.deviceTypeId is required')
  /**
    options.key is null
    */
  t.throws(() => {
    ttsModule.createHandle({
      deviceId: 'xxx',
      deviceTypeId: 'xxx',
      key: null,
      secret: 'xxx'
    })
  }, 'options.key is required')
  t.throws(() => {
    ttsModule.createHandle({
      deviceId: 'xxx',
      deviceTypeId: 'xxx',
      key: '',
      secret: 'xxx'
    })
  }, 'options.key is required')
  t.throws(() => {
    ttsModule.createHandle({
      deviceId: 'xxx',
      deviceTypeId: 'xxx',
      secret: 'xxx'
    })
  }, 'options.key is required')
  /**
    options.secret is null
    */
  t.throws(() => {
    ttsModule.createHandle({
      deviceId: 'xxx',
      deviceTypeId: 'xxx',
      key: 'xxx',
      secret: null
    })
  }, 'options.secret is required')
  t.throws(() => {
    ttsModule.createHandle({
      deviceId: 'xxx',
      deviceTypeId: 'xxx',
      key: 'xxx',
      secret: ''
    })
  }, 'options.secret is required')
  t.throws(() => {
    ttsModule.createHandle({
      deviceId: 'xxx',
      deviceTypeId: 'xxx',
      key: 'xxx'
    })
  }, 'options.secret is required')
  t.end()
})
