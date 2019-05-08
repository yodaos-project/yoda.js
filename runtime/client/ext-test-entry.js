'use strict'

require('@yoda/oh-my-little-pony')
var path = require('path')
var extapp = require('./ext-helper')

var target = process.argv[2]

function test (testGlobs) {
  var resolvePath = require('path').resolve
  var glob = require('glob/sync')

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

extapp.main(target, (appId, pkg) => {
  test([ path.join(target, 'test/**/*.test.js') ])
})
