'use strict'
var EventEmitter = require('events')

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

var PropertyDescriptions = {
  namespace: function Namespace (name, descriptor, namespace, nsDescriptor, bridge) {
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
      var ret = PropertyDescriptions[type](key, propDescriptor, ns, descriptor, bridge)
      ns[key] = ret
    }

    ns.on('newListener', event => {
      var idx = events.indexOf(event)
      if (idx < 0) {
        return
      }
      var propDescriptor = descriptor.events[event]
      PropertyDescriptions.event(event, propDescriptor, ns, descriptor, bridge)
    })
    return ns
  },
  method: function Method (name, descriptor, namespace, nsDescriptor, bridge) {
    return function proxy () {
      /** Should use namespace descriptor as this since property descriptor is a plain object */
      return bridge.invoke(nsDescriptor.name, name, Array.prototype.slice.call(arguments))
    }
  },
  event: function Event (name, descriptor, namespace, nsDescriptor, bridge) {
    /** Should use namespace descriptor as this since property descriptor is a plain object */
    bridge.subscribe(nsDescriptor.name, name, function onEvent () {
      EventEmitter.prototype.emit.apply(
        namespace,
        [ name ].concat(Array.prototype.slice.call(arguments, 0))
      )
    })
  },
  value: function Value (name, descriptor, namespace, nsDescriptor) {
    return descriptor.value
  }
}

module.exports.translate = translate
function translate (descriptor, bridge) {
  var activity = PropertyDescriptions.namespace(null, descriptor, null, null, bridge)
  return activity
}
