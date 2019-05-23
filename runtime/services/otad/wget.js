var childProcess = require('child_process')

/**
 * @typedef DownloadOptions
 * @property {boolean} [noCheckCertificate]
 * @property {boolean} [continue]
 */

module.exports.download = download
/**
 *
 * @private
 * @param {string} url
 * @param {string} dest
 * @param {DownloadOptions} options
 * @param {Function} callback
 */
function download (url, dest, options, callback) {
  var args = []
  if (options.noCheckCertificate) {
    args = args.concat('--no-check-certificate')
  }
  if (options.continue) {
    args = args.concat('-c')
  }
  args = args.concat('-O', dest, url)
  var cp = childProcess.spawn('wget', args)

  var returned = false
  cp.on('error', function onChildProcessError (err) {
    if (returned) {
      return
    }
    returned = true
    callback(err)
  }) /** cp.on('error') */
  cp.on('exit', function onChildProcessExit (code, signal) {
    if (returned) {
      return
    }
    if (code === 0) {
      callback(null)
      return
    }
    var err = new Error(`Failed on download ota image for exit code ${code} and signal ${signal}`)
    err.code = code
    err.signal = signal
    returned = true
    callback(err)
  }) /** cp.on('exit') */
}
