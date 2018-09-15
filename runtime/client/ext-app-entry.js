'use strict'

var logger = require('logger')('ext-app-client')
var translate = require('./translator-ipc').translate
var target = process.argv[2]

function getActivityDescriptor (appId) {
  return new Promise((resolve, reject) => {
    process.on('message', onMessage)
    process.send({
      type: 'status-report',
      status: 'initiating',
      appId: appId
    })

    function onMessage (message) {
      if (message.type !== 'descriptor') {
        return
      }
      if (typeof message.result !== 'object') {
        process.removeListener('message', onMessage)
        return reject(new Error('Nil result on message descriptor.'))
      }
      process.removeListener('message', onMessage)
      resolve(message.result)
    }
  })
}

function launchApp (handle, activity) {
  /** start a new clean context */
  handle(activity)
}

function keepAlive (appId) {
  /**
   * FIXME: though there do have listeners on process#message,
   * ShadowNode still exits on end of current context.
   * Yet this process should be kept alive and waiting for life
   * cycle events.
   */
  var timer = setInterval(() => {
    process.send({
      type: 'ping',
      appId: appId
    })
  }, 10 * 60 * 1000)
  process.on('message', message => {
    if (message.type === 'pong') {
      logger.info('Received pong from VuiDaemon, stop pinging.')
      clearInterval(timer)
    }
  })
  /**
   * FIXME: some native add-on callbacks do not trigger process.nextTick
   * shall be fixed in N-API make callback
   */
  process.nextTick = function fakeNextTick (fn) {
    var params = Array.prototype.slice.call(arguments, 1)
    setTimeout(() => {
      fn.apply(global, params)
    }, 0)
  }
}

function main () {
  if (!target) {
    logger.error('Target is required.')
    process.exit(-1)
  }
  var pkg = require(`${target}/package.json`)
  logger.log(`load target: ${target}/package.json`)

  var main = `${target}/${pkg.main || 'app.js'}`
  var handle = require(main)
  logger.log(`load main: ${main}`)

  var appId = pkg.name

  keepAlive(appId)

  getActivityDescriptor(appId)
    .then(descriptor => {
      var activity = translate(descriptor)
      activity.appHome = target
      launchApp(handle, activity)

      process.send({
        type: 'status-report',
        status: 'ready'
      })
    }).catch(error => {
      process.send({
        type: 'status-report',
        status: 'error',
        error: error.message,
        stack: error.stack
      })
    })
}

module.exports = main
main()
