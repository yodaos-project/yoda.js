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
  namespace: function Namespace (name, descriptor/** , namespace, nsProfile */) {
    var ns = new EventEmitter()
    Object.keys(descriptor).forEach(step)
    /**
     * Since descriptions of activity descriptor are attached to ActivityDescriptor.prototype,
     * keys of prototype shall be iterated too.
     */
    Object.keys(Object.getPrototypeOf(descriptor)).forEach(step)

    function step (key) {
      var propDescriptor = descriptor[key]
      if (typeof propDescriptor !== 'object') {
        return
      }
      if (descriptorTypes.indexOf(propDescriptor.type) < 0) {
        return
      }
      var ret = PropertyDescriptions[propDescriptor.type](key, propDescriptor, ns, descriptor)
      if (propDescriptor.type !== 'event') {
        ns[key] = ret
      }
    }
    return ns
  },
  method: function Method (name, descriptor, namespace, nsDescriptor) {
    return function proxy () {
      /** Should use namespace descriptor as this since property descriptor is a plain object */
      return descriptor.fn.apply(nsDescriptor, arguments)
    }
  },
  event: function Event (name, descriptor, namespace, nsDescriptor) {
    /** Should use namespace descriptor as this since property descriptor is a plain object */
    nsDescriptor.on(name, function onEvent () {
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
var descriptorTypes = Object.keys(PropertyDescriptions)

module.exports.translate = translate
function translate (descriptor) {
  var activity = PropertyDescriptions.namespace(null, descriptor, null, null)
  return activity
}
