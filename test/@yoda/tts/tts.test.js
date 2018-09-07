'use strict'

var test = require('tape')
var ttsModule = require('@yoda/tts')
var logger = require('logger')('tts-test')
var config = require('../../helper/config')

test('module->tts->TtsProxy: check event', t => {
  t.plan(3)
  if (!config || !config.cloudgw) {
    logger.log('skip this case when config not provided')
    t.end()
    return
  }
  var tts = ttsModule.createTts(config.cloudgw)
  var request = tts.speak('hello rokid', (e) => {
    if (!e) {
      t.equal(request.state, 'end', `tts : id=${request.id} call back`)
    }
    tts.disconnect()
    t.end()
  })
  tts.on('start', (id, errno) => {
    t.equal(request.state, 'start', `tts : id=${id} start`)
  })
  tts.on('end', (id, errno) => {
    t.equal(request.state, 'end', `tts : id=${id} end`)
  })
  tts.on('error', (id, errno) => {
    t.fail(`tts speak error, id = ${id} err = ${errno}`)
  })
})

test.skip('module->tts->TtsRequest: check state ', t => {
  if (!config || !config.cloudgw) {
    logger.log('skip this case when config not provided')
    t.end()
    return
  }
  var tts = ttsModule.createTts(config.cloudgw)
  var text = 'hello rokid'
  var req = tts.speak(text, (e) => {
    if (!e) {
      t.equal(req.state, 'end', `tts : id=${req.id} call back`)
    }
    tts.disconnect()
    t.end()
  })
  t.equal(req.state, 'ready', 'request state is ready')
  tts.on('end', (id, errno) => {
    t.equal(req.state, 'end', 'request state is end')
  })
  tts.on('start', (id, errno) => {
    t.equal(req.state, 'start', 'request state is start')
  })
  tts.on('voice', (id, errno) => {
    // not used
  })
  tts.on('cancel', (id, errno) => {
    t.equal(req.state, 'cancel', 'request state is cancel')
    t.fail(`tts speak cancel, id = ${id} err = ${errno}`)
  })
  tts.on('error', (id, errno) => {
    t.equal(req.state, 'error', 'request state is error')
    t.fail(`tts speak error, id = ${id} err = ${errno}`)
  })
})

test('module->tts->disconnect', t => {
  if (!config || !config.cloudgw) {
    logger.log('skip this case when config not provided')
    t.end()
    return
  }
  var tts = ttsModule.createTts(config.cloudgw)
  var text = 'hello rokid'
  var req = tts.speak(text, (e) => {
    logger.info(e)
    if (!e) {
      logger.info(req)
      t.equal(req.state, 'end', `tts : id=${req.id} callback`)
      t.equal(req.text, text)
      tts.disconnect()
      t.equal(tts._requests.length, 0, 'disconnect is ok')
    }
    tts.disconnect()
    t.end()
  })
  tts.on('error', (id, errno) => {
    t.fail(`tts speak error, id = ${id} err = ${errno}`)
  })
})

/**
  bug id = 1290
*/
test.skip('module->tts->TtsProxy: cancel event', t => {
  t.plan(3)
  if (!config || !config.cloudgw) {
    logger.log('skip this case when config not provided')
    t.end()
    return
  }
  var tts = ttsModule.createTts(config.cloudgw)
  var request = tts.speak('hello', () => {
    t.equal(request.state, 'end', `tts : id=${request.id} call back`)
    tts.disconnect()
    t.end()
  })
  tts.on('start', (id, errno) => {
    logger.info(`tts start : id = ${id}, errno = ${errno}`)
    t.equal(request.state, 'start', `tts : id=${id} start`)
    request.stop()
  })
  tts.on('end', (id, errno) => {
    logger.info(`tts end : id = ${id}, errno = ${errno}`)
    t.equal(request.state, 'end', `tts : id=${id} end`)
  })
  tts.on('error', (id, errno) => {
    logger.info(`tts error : id = ${id}, errno = ${errno}`)
    t.fail(`tts speak error, id = ${id} err = ${errno}`)
  })
  tts.on('cancel', (id, errno) => {
    logger.info(`tts cancel : id = ${id}, errno = ${errno}`)
    t.equal(request.state, 'cancel', `tts : id=${id} cancel`)
  })
})

/**
  bug id = 1317
*/
test.skip('module->tts->createTts method test case: normal options params', t => {
  if (!config || !config.cloudgw) {
    logger.log('skip this case when config not provided')
    t.end()
    return
  }
  var tts = ttsModule.createTts(config.cloudgw)
  var req = tts.speak('你好若琪', (e) => {
    if (!e) {
      t.equal(req.state, 'end', `tts : id=${req.id} call back`)
    }
    t.disconnect()
    t.end()
  })
  tts.on('start', (id, errno) => {
    logger.info(`tts start : id = ${id}, errno = ${errno}`)
    t.equal(req.state, 'start', `tts : id=${id} start`)
  })
  tts.on('end', (id, errno) => {
    logger.info(`tts end : id = ${id}, errno = ${errno}`)
    t.equal(req.state, 'end', `tts : id=${id} end`)
  })
  tts.on('error', (id, errno) => {
    logger.info(`tts error : id = ${id}, errno = ${errno}`)
    t.fail('tts event error')
  })
})

/**
  bug id = 1286
*/
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
    logger.info(`tts error : id = ${id}, errno = ${err}`)
    t.ok(err !== '' || err !== null)
    tts.disconnect()
    t.end()
  })
})

test('module->tts->createHandle method test case: normal options', t => {
  t.plan(1)
  t.doesNotThrow(() => {
    var handle = ttsModule.createHandle({
      deviceId: 'xxx',
      deviceTypeId: 'xxx',
      key: 'xxx',
      secret: 'xxx'
    })
    handle.disconnect()
  })
  t.end()
})

test('module->tts->createHandle method test case: error options, options is null', t => {
  t.plan(3)
  /**
    options is null
    */
  t.throws(() => {
    ttsModule.createHandle(null)
  }, 'options is required')
  t.throws(() => {
    ttsModule.createHandle()
  }, 'options is required')
  t.throws(() => {
    ttsModule.createHandle({})
  }, 'options is required')
  t.end()
})

test('module->tts->createHandle method test case: error options, options.deviceId is err', t => {
  t.plan(3)
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
  t.end()
})

test('module->tts->createHandle method test case: error options, options.deviceTypeId is null', t => {
  t.plan(3)
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
  t.end()
})

test('module->tts->createHandle method test case: error options, options.key is null', t => {
  t.plan(3)
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
  t.end()
})

test('module->tts->createHandle method test case: error options, options.secret is null', t => {
  t.plan(3)
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
