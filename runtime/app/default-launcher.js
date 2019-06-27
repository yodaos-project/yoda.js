'use strict'

var childProcess = require('child_process')
var path = require('path')

var kAppModesInstrument = require('../constants').AppScheduler.modes.instrument

var entriesDir = path.join(__dirname, '..', '..', 'client', 'js')
var defaultEntry = path.join(entriesDir, 'ext-app-entry.js')
var instrumentEntry = path.join(entriesDir, 'ext-instrument-entry.js')

module.exports = launchApp
/**
 *
 * @param {string} appId -
 * @param {object} metadata - app metadata
 * @param {AppBridge} bridge -
 * @param {number} mode - running mode
 * @param {object} [options]
 * @param {string} [options.descriptorPath] - api descriptor file to be used
 * @param {string[]} [options.args] - additional execution arguments to the child process
 * @param {object} [options.environs] - additional execution arguments to the child process
 */
function launchApp (appDir, bridge, mode, options) {
  options = options || {}
  var entry = defaultEntry
  if (mode & kAppModesInstrument) {
    entry = instrumentEntry
  }

  var descriptorPath = options.descriptorPath
  if (descriptorPath == null) {
    descriptorPath = path.join(__dirname, '../../client/js/api/default.json')
  }

  var execArgs = [ appDir, descriptorPath ]
  if (options.args) {
    execArgs = execArgs.concat(options.args)
  }
  var cp = childProcess.fork(entry, execArgs, {
    cwd: appDir,
    env: Object.assign({}, process.env, options.environs),
    // rklog would redirect process log to logd if stdout is not a tty
    stdio: [ 'ignore', 'ignore', 'inherit', 'ipc' ]
  })
  bridge.logger.info(`Forked child process ${appDir}(${cp.pid}).`)

  bridge.implement({
    anrEnabled: true,
    exit: (force) => {
      if (force) {
        bridge.logger.info(`force stop process(${cp.pid}).`)
        setTimeout(() => cp.kill(/** SIGKILL */9), 1000)
        return
      }
      bridge.logger.info(`Process(${cp.pid}) end of life, killing process after 1s.`)
      setTimeout(() => cp.kill(), 1000)
    }
  })
  cp.once('error', function onError (err) {
    bridge.logger.error(`Unexpected error on child process(${cp.pid})`, err.message, err.stack)
    cp.kill(/** SIGKILL */9)
  })
  cp.once('exit', (code, signal) => {
    bridge.logger.info(`Process(${cp.pid}) exited with code ${code}, signal ${signal}`)
    bridge.didExit(code, signal)
  })

  return Promise.resolve(cp.pid)
}
