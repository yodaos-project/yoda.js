'use strict'

var logger = require('logger')('ext-app-client')
var translator = require('./translator-ipc')
var flora = require('@yoda/flora')
var apiSymbol = Symbol.for('yoda#api')

module.exports = {
  main: main,
  launchApp: launchApp,
  keepAlive: keepAlive
}

process.once('disconnect', () => {
  logger.info('IPC disconnected, exiting self.')
  process.exit(233)
})

function main (target, descriptorPath, runner) {
  if (!target) {
    logger.error('Target is required.')
    process.exit(-1)
  }
  if (runner == null) {
    runner = noopRunner
  }
  process.title = `${process.argv[0]} yoda-app ${target}`
  var pkg = require(`${target}/package.json`)
  logger.log(`load target: ${target}/package.json`)
  var appId = pkg.name
  logger = require('logger')(`entry-${appId}`)

  var main = `${target}/${pkg.main || 'app.js'}`

  var agent = new flora.Agent(`unix:/var/run/flora.sock#${appId}:${process.pid}`)
  agent.start()

  keepAlive(agent, appId)
  var descriptor = require(descriptorPath)

  // FIXME: unref should be enabled on https://github.com/yodaos-project/ShadowNode/issues/517 got fixed.
  // aliveInterval.unref()
  translator.setLogger(require('logger')(`@ipc-${process.pid}`))
  var api = translator.translate(descriptor, agent)
  api.appId = appId
  api.appHome = target
  global[apiSymbol] = api

  try {
    /**
     * Executes app's main function
     */
    launchApp(main, api)
  } catch (error) {
    logger.error('fatal error:', error.stack)
    agent.call('yodaos.fauna.status-report', ['error', error.stack])
    process.exit(1)
  }

  agent.call('yodaos.fauna.status-report', ['ready'], 'runtime')

  /**
   * Force await on app initialization.
   */
  Promise.resolve()
    .then(() => onceAppCreated(api))
    .then(() => runner(appId, pkg))
    .catch(error => {
      logger.error('fatal error:', error.stack)
      agent.call('yodaos.fauna.status-report', ['error', error.stack])
      process.exit(1)
    })
}

function onceAppCreated (api) {
  return new Promise(resolve => {
    api.once('created', resolve)
  })
}

function launchApp (main, activity) {
  logger.log(`loading app: '${main}'`)
  var handle = require(main)
  /** start a new clean context */
  if (typeof handle === 'function') {
    handle(activity)
  }
}

var aliveInterval
function keepAlive (agent) {
  if (aliveInterval) {
    clearInterval(aliveInterval)
  }
  setAlive(agent)
  aliveInterval = setInterval(() => {
    setAlive(agent)
  }, 5 * 1000)
}

function setAlive (agent) {
  agent.call('yodaos.fauna.status-report', ['alive'], 'runtime')
}

function noopRunner () {

}
