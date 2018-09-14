'use strict'

var EventEmitter = require('events')
var inherits = require('util').inherits
var childProcess = require('child_process')
var path = require('path')
var logger = require('logger')('ext-app')
var ActivityDescriptor = require('./activity-descriptor').ActivityDescriptor

var entry = path.join(__dirname, '..', '..', 'client', 'ext-app-entry.js')

module.exports = createExtApp
/**
 *
 * @author Chengzhong Wu <chengzhong.wu@rokid.com>
 * @param {string} appId -
 * @param {string} target - app home directory
 * @param {AppRuntime} runtime -
 */
function createExtApp (appId, target, runtime) {
  var descriptor = new ActivityDescriptor(appId, target, runtime)

  var cp = childProcess.fork(entry, [ target ], {
    cwd: target,
    env: Object.assign({}, process.env),
    stdio: 'inherit'
  })
  descriptor._childProcess = cp
  logger.info(`Forked child app ${target}.`)

  var eventBus = new EventBus(descriptor, cp)
  var onMessage = eventBus.onMessage.bind(eventBus)
  cp.on('message', onMessage)
  cp.on('disconnect', function onDisconnected () {
    logger.info('Child process disconnected from VuiDaemon.')
  })
  cp.on('error', function onError (err) {
    logger.error(`Unexpected error on child process '${target}'`, err.message, err.stack)
  })
  cp.on('exit', (code, signal) => {
    logger.info(`Child process exited with code ${code}, signal ${signal}`)
    descriptor.emit('exit', code, signal)
  })
  descriptor.once('destruct', () => {
    logger.info(`Activity end of life.`)
    cp.kill()
  })

  return new Promise((resolve, reject) => {
    var timer = setTimeout(() => {
      cp.removeListener('message', onMessage)
      cp.kill()
      reject(new Error(`ExtApp '${target}' failed to be ready in 5s.`))
    }, 5000)

    eventBus.once('status-report:ready', () => {
      clearTimeout(timer)
      resolve(descriptor)
    })
    eventBus.once('status-report:error', error => {
      clearTimeout(timer)
      reject(error)
    })
  })
}

/**
 *
 * @param {ActivityDescriptor} descriptor
 * @param {childProcess.ChildProcess} socket
 */
function EventBus (descriptor, socket) {
  EventEmitter.call(this)
  this.descriptor = descriptor
  this.socket = socket
  this.eventSynTable = {}
  this.eventSyn = 0
}
inherits(EventBus, EventEmitter)

EventBus.prototype.eventTable = [ 'test', 'ping', 'status-report', 'subscribe', 'invoke',
  'subscribe-ack', 'event-ack' ]

EventBus.prototype.onMessage = function onMessage (message) {
  var type = message.type
  if (type === 'status-report' || type === 'subscribe') {
    logger.debug(`Received child message ${message.type} => ${message.event}`)
  } else {
    logger.debug(`Received child message ` +
     `${message.type}(${message.invocationId || -1}) ${message.namespace}.${message.method}`)
  }
  if (this.eventTable.indexOf(type) < 0) {
    logger.warn(`VuiDaemon received unknown ipc message type '${message.type}' from app.`)
    return
  }
  this[type](message)
}

EventBus.prototype.test = function onTest () { /** nothing to do with test */ }
EventBus.prototype.ping = function onPing () { /** nothing to do with ping */ }

EventBus.prototype['status-report'] = function onStatusReport (message) {
  switch (message.status) {
    case 'initiating': {
      this.socket.send({
        type: 'descriptor',
        result: this.descriptor
      })
      break
    }
    case 'ready': {
      this.emit('status-report:ready')
      break
    }
    case 'error': {
      this.emit('status-report:error', new Error(message.error))
      break
    }
    default: {
      logger.info(`Unknown status report type '${message.status}'.`)
    }
  }
}

EventBus.prototype.subscribe = function onSubscribe (message) {
  var self = this
  var event = message.event
  var namespace = message.namespace

  var nsObj = this.descriptor
  if (namespace != null) {
    nsObj = nsObj[namespace]
  }
  nsObj.on(message.event, onEvent)

  function onEvent () {
    if (!self.socket.connected) {
      throw new Error('Child process disconnected')
    }
    self.socket.send({
      type: 'event',
      namespace: namespace,
      event: event,
      params: Array.prototype.slice.call(arguments, 0)
    })
  }
}

EventBus.prototype.invoke = function onInvoke (message) {
  var invocationId = message.invocationId
  var namespace = message.namespace
  var method = message.method
  var params = message.params

  var methodStr = `Activity.${namespace ? namespace + '.' : ''}${method}`

  var nsObj = this.descriptor
  if (namespace != null) {
    nsObj = nsObj[namespace]
  }
  var fnDescriptor = nsObj[method]
  if (fnDescriptor == null &&
      fnDescriptor.type !== 'method') {
    return this.socket.send({
      type: 'fatal-error',
      message: `Unknown method '${methodStr}' invoked.`
    })
  }

  // TODO: returns type handler, currently only 'promise' is supported.
  if (fnDescriptor.returns !== 'promise') {
    throw new Error(`Not implemented return type '${fnDescriptor.returns}' for method '${methodStr}'`)
  }
  var fn = fnDescriptor.fn
  fn.apply(nsObj, params)
    .then(result => this.socket.send({
      type: 'promise',
      action: 'resolve',
      invocationId: invocationId,
      result: result
    }), err => this.socket.send({
      type: 'promise',
      action: 'reject',
      invocationId: invocationId,
      error: err.message,
      stack: err.stack
    }))
}

EventBus.prototype['subscribe-ack'] = function onSubscribeAck (message) {
  var self = this
  var event = message.event
  var namespace = message.namespace

  var nsObj = this.descriptor
  if (namespace != null) {
    nsObj = nsObj[namespace]
  }
  var eventDescriptor = nsObj[event]
  if (eventDescriptor.type !== 'event-ack') {
    return self.socket.send({
      type: 'fatal-error',
      message: `Subscribed non event-ack descriptor '${event}'.`
    })
  }

  if (nsObj[eventDescriptor.trigger]) {
    return self.socket.send({
      type: 'fatal-error',
      message: `Double subscription on event-ack descriptor '${event}'.`
    })
  }
  var timeout = eventDescriptor.timeout || 1000
  nsObj[eventDescriptor.trigger] = function onEventTrigger () {
    if (!self.socket.connected) {
      throw new Error('Child process disconnected')
    }

    var eventId = self.eventSyn
    self.eventSyn += 1
    self.socket.send({
      type: 'event-syn',
      event: event,
      eventId: eventId,
      params: Array.prototype.slice.call(arguments, 0)
    })
    return new Promise((resolve, reject) => {
      var timer = setTimeout(
        () => {
          logger.info('onEventTrigger timedout', eventId)
          delete self.eventSynTable[eventId]
          reject(new Error(`EventAck '${event}' timed out for ${timeout}`))
        },
        timeout)
      self.eventSynTable[eventId] = function onAck () {
        logger.info('onEventTrigger resolved', eventId)
        clearTimeout(timer)
        resolve()
      }
    })
  }
}

EventBus.prototype['event-ack'] = function onEventAck (message) {
  var namespace = message.namespace
  var event = message.event
  var eventId = message.eventId

  var eventStr = `Activity.${namespace ? namespace + '.' : ''}${event}.${eventId}`

  var callback = this.eventSynTable[eventId]
  if (callback == null) {
    logger.info(`Unregistered or timed out event-ack for event '${eventStr}'`)
    return
  }
  logger.info(`Callback event-ack for event '${eventStr}'`)
  callback(message)
}
