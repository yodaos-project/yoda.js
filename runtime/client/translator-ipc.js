'use strict'
var EventEmitter = require('events')
var logger = require('logger')('@ipc')
var wifi = require('@yoda/wifi')

/**
 * interface Descriptor {
 *   type: 'method' | 'namespace' | 'event'
 * }
 *
 * interface Profile {
 *   [key: string]: Descriptor
 * }
 *
 * interface NamespaceDescriptor {
 *   type: 'namespace'
 *   [key: string]: Descriptor
 * }
 *
 * interface MethodDescriptor {
 *   type: 'method'
 *   returns: 'promise'
 * }
 *
 * interface EventDescriptor {
 *   type: 'event'
 * }
 *
 * interface ValueDescriptor {
 *   type: 'value'
 *   value: any
 * }
 */

var eventBus = new EventEmitter()

var invocationId = 0
var MethodProxies = {
  promise: (name, descriptor, ns) => function proxy () {
    var id = invocationId
    invocationId += 1

    /**
     * create error right on invocation
     * to retain current invocation stack on callback errors.
     */
    var err = new Error('Pending error.')
    var args = Array.prototype.slice.call(arguments, 0)
    return new Promise((resolve, reject) => {
      eventBus.once(`promise:${id}`, function onCallback (msg) {
        if (msg.action === 'resolve') {
          return resolve(msg.result)
        }
        if (msg.action === 'reject') {
          err.message = msg.error
          return reject(err)
        }
        err.message = 'Unknown response message type from VuiDaemon.'
        err.msg = msg
        reject(err)
      })

      process.send({
        type: 'invoke',
        invocationId: id,
        namespace: ns.name,
        method: name,
        params: args
      })
    })
  }
}

var PropertyDescriptions = {
  namespace: function Namespace (name, descriptor/** , namespace, nsProfile */) {
    var ns = new EventEmitter()
    ns.name = name
    var events = []
    Object.keys(descriptor).forEach(step)

    function step (key) {
      var propDescriptor = descriptor[key]
      if (typeof propDescriptor !== 'object') {
        return
      }
      if (descriptorTypes.indexOf(propDescriptor.type) < 0) {
        return
      }
      if ([ 'event', 'event-ack' ].indexOf(propDescriptor.type) >= 0) {
        events.push(key)
        return
      }
      var ret = PropertyDescriptions[propDescriptor.type](key, propDescriptor, ns, descriptor)
      ns[key] = ret
    }

    ns.on('newListener', event => {
      var idx = events.indexOf(event)
      if (idx < 0) {
        return
      }
      var propDescriptor = descriptor[event]
      PropertyDescriptions[propDescriptor.type](event, propDescriptor, ns, descriptor)
    })
    return ns
  },
  method: function Method (name, descriptor, namespace, nsDescriptor) {
    var proxyfier = MethodProxies[descriptor.returns]
    if (typeof proxyfier !== 'function') {
      throw new Error(`Not implemented return type '${descriptor.returns}' for function '${name}'.`)
    }

    return proxyfier(name, descriptor, namespace, nsDescriptor)
  },
  event: function Event (name, descriptor, namespace, nsDescriptor) {
    if (descriptor.subscribed) {
      return
    }
    descriptor.subscribed = true
    var channel = `event:${namespace.name ? namespace.name + ':' : ''}${name}`
    eventBus.on(channel, function onEvent (params) {
      EventEmitter.prototype.emit.apply(namespace, [ name ].concat(params))
    })

    process.send({
      type: 'subscribe',
      namespace: namespace.name,
      event: name
    })
  },
  'event-ack': function EventAck (name, descriptor, namespace, nsDescriptor) {
    eventBus.on(`event-syn:${name}`, function onEvent (eventId, params) {
      try {
        EventEmitter.prototype.emit.apply(namespace, [ name ].concat(params))
      } catch (err) {
        return process.send({
          type: 'event-ack',
          namespace: namespace.name,
          event: name,
          eventId: eventId,
          error: err.message
        })
      }
      process.send({
        type: 'event-ack',
        namespace: namespace.name,
        event: name,
        eventId: eventId
      })
    })

    process.send({
      type: 'subscribe-ack',
      namespace: namespace.name,
      event: name
    })
  },
  value: function Value (name, descriptor, namespace, nsDescriptor) {
    return descriptor.value
  }
}
var descriptorTypes = Object.keys(PropertyDescriptions)

module.exports.setLogger = function setLogger (_logger) {
  logger = _logger
}

module.exports.translate = translate
function translate (descriptor) {
  if (typeof process.send !== 'function') {
    throw new Error('IpcTranslator must work in child process.')
  }

  var activity = PropertyDescriptions.namespace(null, descriptor, null, null)

  listenIpc()
  return activity
}

var internalListenMap = {
  'network-connected': () => {
    logger.info('network connected')
    wifi.resetDns()
  }
}

var listenMap = {
  event: msg => {
    var channel = `event:${msg.namespace ? msg.namespace + ':' : ''}${msg.event}`
    if (!Array.isArray(msg.params)) {
      logger.error(`Params of event message '${channel}' is not an array.`)
      return
    }
    logger.debug(`Received VuiDaemon event ${channel}`)
    return eventBus.emit(channel, msg.params)
  },
  'event-syn': msg => {
    var channel = `event-syn:${msg.event}`
    if (!Array.isArray(msg.params)) {
      logger.error(`Params of event message '${channel}' is not an array.`)
      return
    }
    logger.debug(`Received VuiDaemon ack-event ${channel}`)
    return eventBus.emit(channel, msg.eventId, msg.params)
  },
  promise: msg => {
    var channel = `promise:${msg.invocationId}`
    logger.debug(`Received VuiDaemon resolved ${channel}`)
    return eventBus.emit(channel, msg)
  },
  'fatal-error': msg => {
    var err = new Error(msg.message)
    throw err
  },
  internal: message => {
    var handle = internalListenMap[message.topic]
    if (handle == null) {
      logger.info(`Unhandled Internal Ipc message type '${message.type}'.`)
      return
    }

    handle(message)
  }
}

function listenIpc () {
  process.on('message', function onMessage (message) {
    var handle = listenMap[message.type]
    if (handle == null) {
      logger.info(`Unhandled Ipc message type '${message.type}'.`)
      return
    }

    handle(message)
  })
}
