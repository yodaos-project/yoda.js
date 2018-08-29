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
