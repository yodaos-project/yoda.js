'use strict'
var EventEmitter = require('events')
var logger = require('logger')('@ipc')
var agent = null
var FAUNA_TIMEOUT = 10000

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

var messageRegistry = {}

var MethodProxies = {
  promise: (name, descriptor, ns, nsDescriptor) => function proxy () {
    /**
     * create error right on invocation
     * to retain current invocation stack on callback errors.
     */
    var err = new Error('Pending error.')
    var args = Array.prototype.slice.call(arguments, 0)
    return agent.call('yodaos.fauna.invoke', [
      JSON.stringify({
        namespace: nsDescriptor.name,
        method: name,
        params: args
      })
    ], 'runtime', FAUNA_TIMEOUT)
      .then(
        res => {
          var msg = res.msg[0]
          msg = JSON.parse(msg)
          if (msg.action === 'resolve') {
            return msg.result
          }
          if (msg.action === 'reject') {
            Object.assign(err, msg.error)
            throw err
          }
          err.message = 'Unknown response message type from VuiDaemon.'
          err.msg = msg
          throw err
        },
        error => {
          Object.assign(err, error, { name: err.name, message: error.message })
          throw err
        }
      )
  }
}

var PropertyDescriptions = {
  namespace: function Namespace (name, descriptor/** , namespace, nsProfile */) {
    var ns = new EventEmitter()
    descriptor.name = name
    var events = []
    if (typeof descriptor.events === 'object') {
      events = Object.keys(descriptor.events)
    }
    if (typeof descriptor.methods === 'object') {
      Object.keys(descriptor.methods).forEach(key => step('method', key, descriptor.methods[key]))
    }
    if (typeof descriptor.namespaces === 'object') {
      Object.keys(descriptor.namespaces).forEach(key => step('namespace', key, descriptor.namespaces[key]))
    }

    function step (type, key, propDescriptor) {
      if (typeof propDescriptor !== 'object') {
        return
      }
      var ret = PropertyDescriptions[type](key, propDescriptor, ns, descriptor)
      ns[key] = ret
    }

    ns.on('newListener', event => {
      var idx = events.indexOf(event)
      if (idx < 0) {
        return
      }
      var propDescriptor = descriptor.events[event]
      PropertyDescriptions.event(event, propDescriptor, ns, descriptor)
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
    var channel = `event:${nsDescriptor.name ? nsDescriptor.name + ':' : ''}${name}`
    messageRegistry[channel] = function onEvent (params) {
      EventEmitter.prototype.emit.apply(namespace, [ name ].concat(params))
    }

    agent.call('yodaos.fauna.subscribe', [
      JSON.stringify({
        namespace: nsDescriptor.name,
        event: name
      })
    ], 'runtime', FAUNA_TIMEOUT)
  },
  value: function Value (name, descriptor, namespace, nsDescriptor) {
    return descriptor.value
  }
}

module.exports.setLogger = function setLogger (_logger) {
  logger = _logger
}

module.exports.translate = translate
function translate (descriptor, _agent) {
  agent = _agent
  var activity = PropertyDescriptions.namespace(null, descriptor, null, null)

  listenIpc()
  return activity
}

var internalListenMap = {
  'network-connected': () => {
    require('@yoda/wifi').resetDns()
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
    var reg = messageRegistry[channel]
    if (typeof reg === 'function') {
      reg(msg.params)
    }
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
    logger.debug(`Received VuiDaemon internal:${message.topic}`)
    handle(message)
  }
}

function listenIpc () {
  agent.declareMethod('yodaos.fauna.harbor', (req, res) => {
    var handle = listenMap[req[0]]
    if (handle == null) {
      logger.info(`Unhandled Ipc message type '${req[0]}'.`)
      return
    }

    res.end(0, [])
    handle(JSON.parse(req[1]))
  })
}
