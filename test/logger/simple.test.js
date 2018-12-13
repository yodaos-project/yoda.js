'use strict'

// process.env.LOG_PORT = 8081

var test = require('tape')
var logger = require('logger')('log')

var levels = [
  'verbose',
  'debug',
  'info',
  'warn',
  'error'
]

test('simple ', (t) => {
  t.plan(levels.length)
  var text = 'foobar'
  levels.forEach(it =>
    t.doesNotThrow(() =>
      logger[it](text)
    )
  )
})

test('multiple arguments ', (t) => {
  t.plan(levels.length)
  var args = [ 'foobar', 123, { obj: 'foobar' } ]
  levels.forEach(it =>
    t.doesNotThrow(() =>
      logger[it].apply(logger, args)
    )
  )
})

test('log content has format print ', (t) => {
  t.plan(1)
  t.doesNotThrow(() =>
    logger.info('xxxx%sxx%dxx')
  )
})