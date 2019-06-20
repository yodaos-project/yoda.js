/**
 * @module @yodaos/application/vui
 * @description YodaOS application Voice UI framework.
 */

var properties = {}
;[
  { name: 'SequentialFlow', path: './sequential-flow' },
  { name: 'AtomicTask', path: './atomic-task' },
  { name: 'AppTask', path: './app-task' }
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
