'use strict'

// process.env.LOG_PORT = 8081

var test = require('tape')
var logger = require('../../packages/logger')('log')
var levels = require('../../packages/logger').levels
var setGlobalUploadLevel = require('../../packages/logger').setGlobalUploadLevel

test('simple ', (t) => {
  t.plan(levels.length)
  var text = 'foobar'
  t.doesNotThrow(() => {
    for (var i in levels) {
      if (i !== 'none') {
        logger[i](text)
      }
    }
  })
})

test('multiple arguments ', (t) => {
  t.plan(levels.length)
  var args = [ 'foobar', 123, { obj: 'foobar' } ]
  t.doesNotThrow(() => {
    for (var i in levels) {
      if (i !== 'none') {
        logger[i].apply(logger, args)
      }
    }
  })
})

test('log content has format print ', (t) => {
  t.plan(1)
  t.doesNotThrow(() =>
    logger.info('xxxx%sxx%dxx')
  )
})

test('cloud log switch off', (t) => {
  t.plan(1)
  t.doesNotThrow(() => {
    setGlobalUploadLevel(levels.none, '')
  })
})

test('cloud log switch on', (t) => {
  t.plan(Object.keys(levels).length - 1)
  t.doesNotThrow(() => {
    for (var i in levels) {
      if (i !== 'none') {
        setGlobalUploadLevel(levels[i], 'token')
      }
    }
  })
})

test('throw error for unexpected level', (t) => {
  t.plan(1)
  t.throws(() => {
    setGlobalUploadLevel(levels.error + 1, 'token')
  }, `upload level should between [${levels.verbose},${levels.error}]`)
})

test('throw error when enable upload without a valid authorization', (t) => {
  t.plan(1)
  t.throws(() => {
    setGlobalUploadLevel(levels.error)
  }, 'missing cloudgw authorization')
})
