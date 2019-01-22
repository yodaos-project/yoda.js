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

module.exports.endsWith = endsWith
function endsWith (str, search, length) {
  if (typeof str !== 'string') {
    return false
  }
  if (length === undefined || length > this.length) {
    length = str.length
  }
  return str.substring(length - search.length, length) === search
}

module.exports.camelCase = camelCase
function camelCase (str) {
  if (typeof str !== 'string') {
    return ''
  }
  var words = str.match(/[a-z0-9]*/ig)
  if (words == null) {
    return ''
  }
  var result = words
    .map(it => {
      if (it.length === 0) {
        return ''
      }
      return it[0].toUpperCase() + it.substring(1)
    })
    .join('')
  if (result.length === 0) {
    return ''
  }
  return result[0].toLowerCase() + result.substring(1)
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

module.exports.delay = delay
function delay (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
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

module.exports.singleton = singleton
function singleton (fn) {
  fn._locked = false
  var unlock = (res) => {
    fn._locked = false
  }
  return function singletonCallback () {
    if (fn._locked === true) {
      var err = new Error('this function is locked')
      err.code = 'FUNCTION_IS_LOCKED'
      return Promise.reject(err)
    }
    fn._locked = true
    var ret = fn.apply(this, arguments)
    if (ret instanceof Promise) {
      ret.then(unlock, unlock)
    } else {
      throw new TypeError('singleton only works on Promise object')
    }
    return ret
  }
}

module.exports.format = format
function format (s) {
  if (typeof s !== 'string') {
    throw new Error('Expect a string on first argument of _.format')
  }

  var i = 1
  var args = arguments
  var argString
  var str = ''
  var start = 0
  var end = 0

  while (end < s.length) {
    if (s.charAt(end) !== '%') {
      end++
      continue
    }

    str += s.slice(start, end)

    switch (s.charAt(end + 1)) {
      case 's':
        argString = String(args[i])
        break
      case 'd':
        argString = Number(args[i])
        break
      case 'j':
        try {
          argString = JSON.stringify(args[i])
        } catch (_) {
          argString = '[Circular]'
        }
        break
      case '%':
        str += '%'
        start = end = end + 2
        continue
      default:
        str = str + '%' + s.charAt(end + 1)
        start = end = end + 2
        continue
    }

    if (i >= args.length) {
      str = str + '%' + s.charAt(end + 1)
    } else {
      i++
      str += argString
    }

    start = end = end + 2
  }

  str += s.slice(start, end)

  return str
}
