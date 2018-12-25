'use strict'

var logger = require('logger')('ext-app-client')

require('@yoda/oh-my-little-pony')
var extapp = require('./ext-helper')

var target = process.argv[2]

function test (testGlobs) {
  var tape = require('tape')
  var resolvePath = require('path').resolve
  var glob = require('tape/vendor/glob/glob-sync')

  var total = 0
  var ended = 0
  tape.createStream({ objectMode: true }).on('data', (row) => {
    logger.warn('test', row)
    switch (row.type) {
      case 'test':
        ++total
        break
      case 'end':
        ++ended
        if (ended === total) {
          // TODO: dump test result
          extapp.stopAlive()
        }
        break
      default:
    }
  })

  var cwd = process.cwd()
  testGlobs.forEach(function (arg) {
  // If glob does not match, `files` will be an empty array.
  // Note: `glob.sync` may throw an error and crash the node process.
    var files = glob(arg)

    if (!Array.isArray(files)) {
      throw new TypeError('unknown error: glob.sync did not return an array or throw. Please report this.')
    }

    files.forEach(function (file) {
      require(resolvePath(cwd, file))
    })
  })
}

extapp.main(target, (appId, pkg, activity) => {
  global.activity = activity
  test([ 'test/**/*.test.js' ])
})
