'use strict'

var childProcess = require('child_process')
var path = require('path')
var fs = require('fs')
var promisify = require('util').promisify
var _ = require('@yoda/util')._

var readFileAsync = promisify(fs.readFile)
var statAsync = promisify(fs.stat)

module.exports = launchExecutable
/**
 *
 * @param {string} appId -
 * @param {string} target - app home directory
 * @param {AppRuntime} runtime -
 */
function launchExecutable (appDir, bridge) {
  var packageJsonPath = path.join(appDir, 'package.json')
  var executablePath

  return readFileAsync(packageJsonPath, 'utf8')
    .then(data => {
      var packageJson = JSON.parse(data)
      executablePath = path.join(appDir, _.get(packageJson, 'main'))
      return statAsync(executablePath)
    })
    .then(stat => {
      if (!stat.isFile()) {
        throw new Error(`Given main executable(${executablePath}) is not a file`)
      }
      if (!isExecutableMode(stat.mode)) {
        throw new Error(`Given main executable(${executablePath}) is not an executable`)
      }

      var cp = childProcess.spawn(executablePath, [], {
        cwd: appDir,
        stdio: [ 'ignore', 'ignore', 'inherit' ]
      })

      cp.once('error', function onError (err) {
        bridge.logger.error(`Process(${cp.pid}) Unexpected error on child process '${appDir}'`, err.message, err.stack)
        cp.kill('SIGKILL')
      })
      cp.once('exit', (code, signal) => {
        bridge.logger.info(`Process(${cp.pid}) exited with code ${code}, signal ${signal}`)
        bridge.didExit(code, signal)
      })
      bridge.implement({
        anrEnabled: true,
        exit: (force, gcore) => {
          if (force) {
            bridge.logger.info(`force stop process(${cp.pid}).`)
            cp.kill('SIGKILL')
            return
          }
          if (gcore) {
            bridge.logger.info(`abort process(${cp.pid}).`)
            cp.kill('SIGABRT')
            return
          }
          bridge.logger.info(`Process(${cp.pid}) end of life, killing process after 1s.`)
          setTimeout(() => cp.kill(), 1000)
        }
      })

      return cp.pid
    })
}

function isExecutableMode (mode) {
  return (mode & 0x1C0) >> 6 === 7
}
