'use strict'

var logger = require('logger')('ext-app-client')
var translator = require('./translator-ipc')
var apiSymbol = Symbol.for('yoda#api')

module.exports = {
  main: main,
  getActivityDescriptor: getActivityDescriptor,
  launchApp: launchApp,
  keepAlive: keepAlive,
  stopAlive: stopAlive
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
      translator.setLogger(require('logger')(`@ipc-${process.pid}`))
      var activity = translator.translate(descriptor)
      activity.appId = appId
      activity.appHome = target
      global[apiSymbol] = activity

      /**
       * Executes app's main function
       */
      launchApp(main, activity)
      runner(appId, pkg, activity)

      process.send({
        type: 'status-report',
        status: 'ready'
      })
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
  /**
   * FIXME: though there do have listeners on process#message,
   * ShadowNode still exits on end of current context.
   * Yet this process should be kept alive and waiting for life
   * cycle events.
   */
  aliveInterval = setInterval(() => {
    process.send({ type: 'ping' })
  }, 5 * 1000)
  process.on('message', message => {
    if (message.type === 'pong') {
      logger.info('Received pong from VuiDaemon.')
      stopAlive()
    }
  })
}

function stopAlive () {
  clearInterval(aliveInterval)
}

function noopRunner () {

}
