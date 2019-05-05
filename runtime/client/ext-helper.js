'use strict'

var logger = require('logger')('ext-app-client')
var translator = require('./translator-ipc')
var apiSymbol = Symbol.for('yoda#api')

module.exports = {
  main: main,
  getActivityDescriptor: getActivityDescriptor,
  launchApp: launchApp,
  keepAlive: keepAlive
}

process.once('disconnect', () => {
  logger.info('IPC disconnected, exiting self.')
  process.exit(233)
})

function main (target, runner) {
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

  keepAlive()
  getActivityDescriptor()
    .then(descriptor => {
      // FIXME: unref should be enabled on https://github.com/yodaos-project/ShadowNode/issues/517 got fixed.
      // aliveInterval.unref()
      translator.setLogger(require('logger')(`@ipc-${process.pid}`))
      var api = translator.translate(descriptor)
      api.appId = appId
      api.appHome = target
      global[apiSymbol] = api

      /**
       * Executes app's main function
       */
      launchApp(main, api)

      process.send({
        type: 'status-report',
        status: 'ready'
      })

      runner(appId, pkg)
    }).catch(error => {
      logger.error('fatal error:', error.stack)
      process.send({
        type: 'status-report',
        status: 'error',
        error: error.message,
        stack: error.stack
      })
      process.exit(1)
    })
}

function getActivityDescriptor () {
  return new Promise((resolve, reject) => {
    process.on('message', onMessage)
    process.send({
      type: 'status-report',
      status: 'initiating'
    })

    function onMessage (message) {
      if (message.type !== 'descriptor') {
        return
      }
      process.removeListener('message', onMessage)
      if (typeof message.result !== 'string') {
        return reject(new Error('Unexpected result on fetching descriptor path.'))
      }
      return resolve(require(message.result))
    }
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
function keepAlive () {
  if (aliveInterval) {
    clearInterval(aliveInterval)
  }
  setAlive()
  aliveInterval = setInterval(() => {
    setAlive()
  }, 5 * 1000)
}

function setAlive () {
  process.send({ type: 'alive' })
}

function noopRunner () {

}
