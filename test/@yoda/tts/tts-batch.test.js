'use strict'

var test = require('tape')
var logger = require('logger')('tts-test')
var config = require('../../helper/config')
var ttsModule = require('@yoda/tts')

test.skip('module->tts->call method speak', t => {
  if (!config || !config.cloudgw) {
    logger.log('skip this case when config not provided')
    t.end()
    return
  }
  var tts = ttsModule.createTts(config.cloudgw)
  var request = tts.speak('<break time="5s"/>小雅小雅<break time="0.3s"/>我要听音乐', (e) => {
    if (e) {
      t.fail(e)
    }
    t.pass('req call back')
  })
  var request2 = tts.speak('hello<break strength="medium"/><prosody pitch="x-high">rokid</prosody>', (e) => {
    if (e) {
      t.fail(e)
    }
    t.pass('req2 call back')
  })
  var request3 = tts.speak('<phoneme alphabet="py" ph="zhong1/guo2">中国</phoneme>', (e) => {
    if (e) {
      t.fail(e)
    }
    t.pass('req3 call back')
    tts.disconnect()
    t.end()
  })
  logger.info(request)
  logger.info(request2)
  logger.info(request3)
  t.notEqual(request2.id, request.id)
  t.notEqual(request3.id, request2.id)
  tts.on('start', (id, errno) => {
    logger.info(`tts start : id = ${id}, errno = ${errno}`)
  })
  tts.on('end', (id, errno) => {
    logger.info(`tts end : id = ${id}, errno = ${errno}`)
  })
  tts.on('error', (id, errno) => {
    t.fail(`tts error : id = ${id}, errno = ${errno}`)
  })
  tts.on('cancel', (id, errno) => {
    t.fail(`tts cancel : id = ${id}, errno = ${errno}`)
  })
})

test.skip('module->tts->stopall after speak ', t => {
  if (!config || !config.cloudgw) {
    logger.log('skip this case when config not provided')
    t.end()
    return
  }
  var tts = ttsModule.createTts(config.cloudgw)
  var cancel = 0
  tts.speak('hello rokid', (e) => {
    if (e) {
      t.fail(e)
    }
  })
  tts.speak('hello rokid', (e) => {
    if (e) {
      t.fail(e)
    }
  })
  tts.speak('hello rokid', (e) => {
    if (e) {
      t.fail(e)
    }
    t.equal(cancel, 3)
    tts.disconnect()
    t.end()
  })
  tts.stopAll()
  tts.on('start', (id, errno) => {
    logger.info(`tts start : id = ${id}, errno = ${errno}`)
  })
  tts.on('end', (id, errno) => {
    logger.info(`tts end : id = ${id}, errno = ${errno}`)
  })
  tts.on('error', (id, errno) => {
    logger.info(`tts error : id = ${id}, errno = ${errno}`)
    t.fail('call speack error')
  })
  tts.on('cancel', (id, errno) => {
    cancel++
    t.pass(`tts cancel : id = ${id}, errno = ${errno}`)
  })
})

test.skip('module->tts->stopall after start ', t => {
  if (!config || !config.cloudgw) {
    logger.log('skip this case when config not provided')
    t.end()
    return
  }
  var tts = ttsModule.createTts(config.cloudgw)
  var cancel = 0
  tts.speak('hello rokid', (e) => {
    if (e) {
      t.fail(e)
    }
  })
  tts.speak('hello rokid', (e) => {
    if (e) {
      t.fail(e)
    }
  })
  tts.speak('hello rokid', (e) => {
    if (e) {
      t.fail(e)
    }
    t.equal(cancel, 3)
    tts.disconnect()
    t.end()
  })
  tts.on('start', (id, errno) => {
    logger.info(`tts start : id = ${id}, errno = ${errno}`)
    tts.stopAll()
  })
  tts.on('end', (id, errno) => {
    logger.info(`tts end : id = ${id}, errno = ${errno}`)
  })
  tts.on('error', (id, errno) => {
    t.fail(`tts error : id = ${id}, errno = ${errno}`)
  })
  tts.on('cancel', (id, errno) => {
    cancel++
    t.pass(`tts cancel : id = ${id}, errno = ${errno}`)
  })
})
