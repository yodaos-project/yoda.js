var bootstrap = require('../../bootstrap')
var _ = require('@yoda/util')._

module.exports = function appSchedulerBootstrap () {
  var suite = bootstrap()
  var appScheduler = suite.component.appScheduler
  appScheduler.appLauncher.test = testLauncher
  appScheduler.appLauncher.startupCrash = startupCrashLauncher
  appScheduler.appLauncher.deadOnExit = deadOnExitLauncher

  return suite
}

function testLauncher (appId, metadata, bridge, mode, options) {
  bridge.__launchArgs = [ appId, metadata, bridge, mode, options ]
  bridge.implement({
    anrEnabled: _.get(options, 'anrEnabled', true),
    exit: (force) => {
      if (force) {
        bridge.logger.info(`force stop app.`)
        bridge.didExit(0, 'SIGKILL')
        return
      }
      bridge.logger.info(`Process end of life, killing process after 1s.`)
      setTimeout(() => bridge.didExit(0, 'SIGTERM'), 1000)
    }
  })
  setTimeout(() => {
    bridge.didReady()
  }, 1000)
  return Promise.resolve(233)
}

function startupCrashLauncher (appId, metadata, bridge, mode, options) {
  bridge.__launchArgs = [ appId, metadata, bridge, mode, options ]
  bridge.implement({
    anrEnabled: true,
    exit: doExit.bind(global, bridge)
  })
  setTimeout(() => {
    bridge.didReady(new Error('Foobar error on startup'))
  }, 1000)
  return Promise.resolve(233)
}

function deadOnExitLauncher (appId, metadata, bridge, mode, options) {
  bridge.__launchArgs = [ appId, metadata, bridge, mode, options ]
  bridge.implement({
    anrEnabled: true,
    exit: (force) => {
      if (force) {
        bridge.logger.info(`force stop app.`)
        setTimeout(() => bridge.didExit(0, 'SIGKILL'), 1)
        return
      }
      bridge.logger.info(`app pretending dead on exit.`)
    }
  })
  setTimeout(() => {
    bridge.didReady()
  }, 1000)
  return Promise.resolve(233)
}

function doExit (bridge, force) {
  if (force) {
    bridge.logger.info(`force stop app.`)
    bridge.didExit(0, 'SIGKILL')
    return
  }
  bridge.logger.info(`Process end of life, killing process after 1s.`)
  setTimeout(() => bridge.didExit(0, 'SIGTERM'), 1000)
}
