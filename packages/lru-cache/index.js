'use strict'

var LinkedList = require('./linked-list')

var MAX = Symbol('max')
var LENGTH = Symbol('length')
var LRU_LIST = Symbol('lruList')
var CACHE = Symbol('cache')

// lruList is a yallist where the head is the youngest
// item, and the tail is the oldest. the list contains the Hit
// objects as the entries.
// Each Hit object has a reference to its Yallist.Node.  This
// never changes.
//
// cache is a Map (or PseudoMap) that matches the keys to
// the Yallist.Node object.
function LRUCache (options) {
  if (typeof options === 'number') { options = { max: options } }

  if (!options) { options = {} }

  if (options.max && (typeof options.max !== 'number' || options.max < 0)) { throw new TypeError('max must be a non-negative number') }
  // Kind of weird to have a default max of Infinity, but oh well.
  this[MAX] = options.max || Infinity

  this.reset()
}

Object.defineProperties(LRUCache.prototype, {
  max: {
    enumerable: true,
    configurable: true,
    // resize the cache when the max changes.
    set: function (mL) {
      if (typeof mL !== 'number' || mL < 0) { throw new TypeError('max must be a non-negative number') }

      this[MAX] = mL || Infinity
      trim(this)
    },
    get: function () {
      return this[MAX]
    }
  },
  length: {
    enumerable: true,
    configurable: true,
    get: function () {
      return this[LENGTH]
    }
  }
})

LRUCache.prototype.reset = function reset () {
  this[CACHE] = Object.create(null) // hash of items by key
  this[LRU_LIST] = new LinkedList() // list of items in order of use recency
  this[LENGTH] = 0 // length of items in the list
}

LRUCache.prototype.set = function set (key, value) {
  if (has(this, key)) {
    var node = this[CACHE][key]
    var item = node.value

    item.value = value
    this.get(key)
    trim(this)
    return true
  }

  var hit = new Entry(key, value)

  this[LENGTH] += 1
  this[LRU_LIST].unshift(hit)
  this[CACHE][key] = this[LRU_LIST].head
  trim(this)
  return true
}

LRUCache.prototype.has = function Has (key) {
  return has(this, key)
}

LRUCache.prototype.get = function Get (key) {
  return get(this, key, true)
}

LRUCache.prototype.peek = function Peek (key) {
  return get(this, key, false)
}

LRUCache.prototype.pop = function Pop () {
  var node = this[LRU_LIST].pop()
  if (!node) { return null }

  del(this, node)
  return node.value
}

LRUCache.prototype.del = function Del (key) {
  del(this, this[CACHE][key])
}

function get (self, key, doUse) {
  var node = self[CACHE][key]
  if (node) {
    var hit = node.value
    if (doUse) {
      self[LRU_LIST].unshiftNode(node)
    }
    return hit.value
  }
}

function trim (self) {
  if (self[LENGTH] > self[MAX]) {
    for (var walker = self[LRU_LIST].tail;
      self[LENGTH] > self[MAX] && walker !== null;) {
      // We know that we're about to devare this one, and also
      // what the next least recently used key will be, so just
      // go ahead and set it now.
      var prev = walker.prev
      del(self, walker)
      walker = prev
    }
  }
}

function del (self, node) {
  if (node) {
    var hit = node.value

    self[LENGTH] -= 1
    delete self[CACHE][hit.key]
    self[LRU_LIST].removeNode(node)
  }
}

function has (self, key) {
  return Object.prototype.hasOwnProperty.call(self[CACHE], key)
}

class Entry {
  constructor (key, value) {
    this.key = key
    this.value = value
  }
}

module.exports = LRUCache
