module.exports.get = get
function get (object, path, defaults) {
  if (object == null) {
    return defaults
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
