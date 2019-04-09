var fs = require('fs')
var path = require('path')

function Storage (appDataDir) {
  this.appDataDir = appDataDir
  this.cache = {}
  var stat
  try {
    stat = fs.statSync(this.appDataDir)
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e
    }

    try {
      fs.mkdirSync(this.appDataDir)
    } catch (e) {
      if (e.code !== 'EEXIST') {
        throw e
      }
    }
  }
  if (stat != null && !stat.isDirectory()) {
    throw new Error('Storage path conflicts.')
  }
}

Storage.prototype.key = function key (n) {
  var items = fs.readdirSync(this.appDataDir)
  return items[n]
}

Storage.prototype.getItem = function getItem (key) {
  // Prevents from miss-break-through
  if (Object.prototype.hasOwnProperty.call(this.cache, key)) {
    return this.cache[key]
  }
  var res
  try {
    res = fs.readFileSync(path.join(this.appDataDir, key))
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e
    }
    res = undefined
  }
  this.cache[key] = res
  return res
}

Storage.prototype.setItem = function setItem (key, value) {
  value = String(value)
  this.cache[key] = value
  fs.writeFileSync(path.join(this.appDataDir, key), value)
}

Storage.prototype.removeItem = function removeItem (key) {
  this.cache[key] = undefined
  fs.unlinkSync(path.join(this.appDataDir, key))
}

Storage.prototype.clear = function clear () {
  var items = fs.readdirSync(this.appDataDir)
  items.forEach(it => {
    fs.unlinkSync(path.join(this.appDataDir, it))
  })
  this.cache = {}
}

module.exports = Storage
