var fs = require('fs')
var path = require('path')

module.exports.mkdirp = mkdirp
/**
 * @param {string} dir
 * @param {Function} callback
 */
function mkdirp (dir, callback) {
  fs.mkdir(dir, function onMkdir (err) {
    if (err == null) {
      return callback(null)
    }
    if (err.code === 'ENOENT') {
      mkdirp(path.dirname(dir), function onMkdirp (err) {
        if (err) {
          return callback(err)
        }
        mkdirp(dir, callback)
      }) /** mkdirp */
      return
    }
    fs.stat(dir, function onStat (err, stat) {
      if (err) {
        return callback(err)
      }
      if (!stat.isDirectory()) {
        var eexist = new Error('Path exists')
        eexist.path = dir
        eexist.code = 'EEXIST'
        return callback(eexist)
      }
      return callback(null)
    }) /** fs.stat */
  }) /** fs.mkdir */
}
