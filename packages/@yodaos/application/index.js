/**
 * @module @yodaos/application
 * @description YODAOS application framework.
 */

var properties = {}
;[
  { name: 'Application', path: './application' },
  { name: 'Service', path: './service' }
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
