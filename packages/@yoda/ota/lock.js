var path = require('path')
var flock = require('flock')
var yodaUtil = require('@yoda/util')

module.exports = lock

/**
 * @callback lockCallback
 * @param {err} error
 * @param {Function} unlock
 */

/**
 *
 * @param {string} lpath - lock filepath
 * @param {lockCallback} callback
 */
function lock (lpath, callback) {
  var dirname = path.dirname(lpath)
  yodaUtil.fs.mkdirp(dirname, function onMkdirp (err) {
    if (err) callback(err)
    flock.lock(lpath, { exclusive: true }, function onLock (err, lock) {
      if (err) {
        return callback(err)
      }
      callback(null, unlock)

      function unlock (unlockCallback) {
        flock.unlock(lock, unlockCallback)
      }
    }) /** flock.lock */
  }) /** mkdirp */
}
