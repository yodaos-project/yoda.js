'use strict'

var childProcess = require('child_process')
var path = require('path')
var fs = require('fs')
var promisify = require('util').promisify
var logger = require('logger')('ext-app')
var _ = require('@yoda/util')._
var ActivityDescriptor = require('../descriptor/activity-descriptor')

var readFileAsync = promisify(fs.readFile)
var statAsync = promisify(fs.stat)

module.exports = createExtApp
/**
 *
 * @author Chengzhong Wu <chengzhong.wu@rokid.com>
 * @param {string} appId -
 * @param {string} target - app home directory
 * @param {AppRuntime} runtime -
 */
function createExtApp (appId, metadata, runtime) {
  var target = _.get(metadata, 'appHome')
  var descriptor = new ActivityDescriptor(appId, target, runtime)
  var packageJsonPath = path.join(target, 'package.json')
  var executablePath

  return readFileAsync(packageJsonPath, 'utf8')
    .then(data => {
      var packageJson = JSON.parse(data)
      executablePath = path.join(target, _.get(packageJson, 'main'))
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
        cwd: target,
        stdio: 'inherit'
      })

      cp.once('error', function onError (err) {
        logger.error(`${appId}(${cp.pid}) Unexpected error on child process '${target}'`, err.message, err.stack)
        cp.kill(/** SIGKILL */9)
      })
      cp.once('exit', (code, signal) => {
        logger.info(`${appId}(${cp.pid}) exited with code ${code}, signal ${signal}, disconnected? ${!cp.connected}`)
        descriptor.emit('exit', code, signal)
      })
      descriptor.once('destruct', () => {
        logger.info(`${appId}(${cp.pid}) Activity end of life, killing process.`)
        cp.kill()
      })
      return descriptor
    })
}

function isExecutableMode (mode) {
  return (mode & 0x1C0) >> 6 === 7
}
