module.exports.get = get
function get (object, path, defaults) {
  if (object == null) {
    return defaults
  }

  // optimize for directly usage
  if (object && typeof object.hasOwnProperty === 'function' &&
    object.hasOwnProperty(path)) {
    return object[path]
  }

  var ret
  if (typeof path !== 'string') {
    ret = object[path]
    if (ret === undefined) {
      ret = defaults
    }
    return ret
  }

  var paths = path.split('.')
  ret = object[paths[0]]
  for (var idx = 1; idx < paths.length && ret != null; ++idx) {
    ret = ret[paths[idx]]
  }
  if (ret === undefined) {
    ret = defaults
  }
  return ret
}

module.exports.pick = pick
function pick (object) {
  if (object == null) {
    return object
  }
  var ret = {}
  var keys = Array.prototype.slice.call(arguments, 1)
  keys.forEach(key => {
    ret[key] = object[key]
  })
  return ret
}

module.exports.startsWith = startsWith
function startsWith (str, search, pos) {
  if (typeof str !== 'string') {
    return false
  }
  return str.substring(!pos || pos < 0 ? 0 : +pos, search.length) === search
}

module.exports.sample = sample
function sample (arr) {
  var length = get(arr, 'length', 0)
  return get(arr, Math.floor(Math.random() * length))
}

module.exports.times = times
function times (number) {
  var ret = []
  for (var idx = 0; idx < number; ++idx) {
    ret.push(idx)
  }
  return ret
}

module.exports.mapSeries = mapSeries
function mapSeries (iterable, mapper) {
  var ret = []
  return step(0)
  function step (idx) {
    if (idx >= iterable.length) {
      return Promise.resolve(ret)
    }
    return Promise.resolve(mapper(iterable[idx], idx))
      .then(res => {
        ret.push(res)
        return step(idx + 1)
      })
  }
}

module.exports.once = once
function once (callback) {
  var called = false
  var ret
  return function dedupCallback () {
    if (!called) {
      called = true
      ret = callback.apply(this, arguments)
    }
    return ret
  }
}
