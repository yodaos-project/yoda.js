/**
 * @module @yodaos/application
 * @description YodaOS application framework.
 */

var properties = {}
;[
  { name: 'Application', path: './application' },
  { name: 'AudioFocus', path: './audio-focus' },
  { name: 'Service', path: './service' },
  { name: 'vui', path: './vui' }
].forEach(it => {
  properties[it.name] = {
    enumerable: true,
    configurable: false,
    get: () => {
      var cc = it.cache
      if (cc == null) {
        cc = it.cache = require(it.path)
      }
      return cc
    }
  }
})
Object.defineProperties(module.exports, properties)
