var fs = require('fs')
var path = require('path')
var LRU = require('lru-cache')
var mkdirpSync = require('@yoda/util/fs').mkdirpSync

function Storage (appDataDir, max) {
  this.appDataDir = appDataDir
  this.cache = new LRU(max || 15)
  mkdirpSync(this.appDataDir)
}

/**
 * The `key()` method of the `Storage` interface, when passed a number n, returns
 *  the name of the nth key in a given `Storage` object.
 */
Storage.prototype.key = function key (n) {
  var items = fs.readdirSync(this.appDataDir)
  return items[n]
}

/**
 * The `getItem()` method of the `Storage` interface, when passed a key name,
 * will return that key's value, or `null` if the key does not exist, in the given
 * `Storage` object.
 *
 * @param {string} key
 */
Storage.prototype.getItem = function getItem (key) {
  // Prevents from miss-break-through
  if (this.cache.has(key)) {
    return this.cache.get(key)
  }
  var res
  try {
    res = fs.readFileSync(path.join(this.appDataDir, key), 'utf8')
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e
    }
    res = null
  }
  this.cache.set(key, res)
  return res
}

/**
 * The `setItem()` method of the `Storage` interface, when passed
 * a key name and value, will add that key to the given `Storage`
 * object, or update that key's value if it already exists.
 */
Storage.prototype.setItem = function setItem (key, value) {
  value = String(value)
  this.cache.set(key, value)
  fs.writeFileSync(path.join(this.appDataDir, key), value)
}

/**
 * The `removeItem()` method of the `Storage` interface, when passed
 * a key name, will remove that key from the given `Storage` object if
 * it exists. If there is no item associated with the given key, this
 * method will do nothing.
 *
 * @param {string} key
 */
Storage.prototype.removeItem = function removeItem (key) {
  this.cache.del(key)
  try {
    fs.unlinkSync(path.join(this.appDataDir, key))
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e
    }
  }
}

/**
 * The `clear()` method of the `Storage` interface clears all keys
 * stored in a given Storage object.
 */
Storage.prototype.clear = function clear () {
  var items = fs.readdirSync(this.appDataDir)
  items.forEach(it => {
    try {
      fs.unlinkSync(path.join(this.appDataDir, it))
    } catch (e) {
      if (e.code !== 'ENOENT') {
        throw e
      }
    }
  })
  this.cache.reset()
}

module.exports = Storage
var localStorage
Object.defineProperty(module.exports, 'localStorage', {
  enumerable: true,
  configurable: true,
  get: () => {
    if (localStorage == null) {
      var appId = global[Symbol.for('yoda#api')].appId
      localStorage = new Storage(path.join('/data/appData', appId), 10)
    }
    return localStorage
  }
})
