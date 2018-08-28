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
 *   returns: 'direct' | 'promise'
 * }
 *
 * interface Event {
 *   type: 'event'
 * }
 */

var PropertyDescriptions = {
  namespace: function Namespace (name, profile/** , namespace, nsProfile */) {
    var ns = new EventEmitter()
    Object.keys(profile).forEach(key => {
      var descriptor = profile[key]
      if (typeof descriptor !== 'object') {
        return
      }
      if (descriptorTypes.indexOf(descriptor.type) < 0) {
        return
      }
      var ret = PropertyDescriptions[descriptor.type](key, descriptor, ns, profile)
      if (descriptor.type !== 'event') {
        ns[key] = ret
      }
    })
    return ns
  },
  method: function Method (name, descriptor, namespace, nsProfile) {
    return function proxy () {
      return descriptor.fn.apply(null, arguments)
    }
  },
  event: function Event (name, descriptor, namespace, nsProfile) {
    nsProfile.on(name, function onEvent () {
      EventEmitter.prototype.emit.apply(
        namespace,
        [ name ].concat(Array.prototype.slice.call(arguments, 0))
      )
    })
  }
}
var descriptorTypes = Object.keys(PropertyDescriptions)

module.exports.translate = translate
function translate (profile) {
  var activity = PropertyDescriptions.namespace(null, profile, null, null)
  return activity
}
