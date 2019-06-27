'use strict'

require('@yoda/oh-my-little-pony')
var extapp = require('./ext-helper')

var target = process.argv[2]
var descriptorPath = process.argv[3]
var instruments = process.argv[4]

function instrument (instruments) {
  var resolvePath = require('path').resolve
  var glob = require('glob/sync')

  var cwd = process.cwd()
  // If glob does not match, `files` will be an empty array.
  // Note: `glob.sync` may throw an error and crash the node process.
  var files = glob(instruments)

  if (!Array.isArray(files)) {
    throw new TypeError('unknown error: glob.sync did not return an array or throw. Please report this.')
  }

  files.forEach(function (file) {
    require(resolvePath(cwd, file))
  })
}

extapp.main(target, descriptorPath, (appId, pkg) => {
  instrument(instruments)
})
