var path = require('path')

module.exports.takeHeapSnapshot = takeHeapSnapshot
function takeHeapSnapshot (dir, tag) {
  if (typeof dir !== 'string' || !path.isAbsolute(dir)) {
    dir = '/data'
  }
  var fullpath = path.join(dir, `${tag}-heap-snapshot-${new Date().toISOString()}.json`)
  var profiler = require('profiler')
  profiler.takeSnapshot(fullpath)
  return fullpath
}
