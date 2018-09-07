'use strict'

var test = require('tape')
var logger = require('logger')('tts-test')
var config = require('../../helper/config')
var tts = require('@yoda/tts').createTts(config.cloudgw)

test.skip('module->tts->call method speak', t => {
  var request = tts.speak('你好若琪', (e) => {
    logger.info('call back')
  })
  var request2 = tts.speak('你好若琪', (e) => {
    tts.disconnect()
    t.end()
  })
  t.notEqual(request2.id, request.id)
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
    logger.info(`tts cancel : id = ${id}, errno = ${errno}`)
    t.fail('cancel event occur')
  })
})

test('module->tts->stopall after speak ', t => {
  tts.speak('hello rokid', (e) => {
    if (e) {
      t.fail(e)
    }
  })
  tts.speak('hello rokid', (e) => {
    if (e) {
      t.fail(e)
    }
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
    logger.info(`tts cancel : id = ${id}, errno = ${errno}`)
  })
})

test('module->tts->stopall after start ', t => {
  tts.speak('hello rokid', (e) => {
    if (e) {
      t.fail(e)
    }
  })
  tts.speak('hello rokid', (e) => {
    if (e) {
      t.fail(e)
    }
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
    logger.info(`tts error : id = ${id}, errno = ${errno}`)
    t.fail('call speack error')
  })
  tts.on('cancel', (id, errno) => {
    logger.info(`tts cancel : id = ${id}, errno = ${errno}`)
  })
})
