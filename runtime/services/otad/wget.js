var childProcess = require('child_process')
var Url = require('url')
var http = require('http')
var https = require('https')

/**
 * @typedef DownloadOptions
 * @property {number} [timeout=15] timeout in seconds
 * @property {boolean} [noCheckCertificate]
 * @property {boolean} [continue]
 */

module.exports.download = download
module.exports.fetchImageSize = fetchImageSize
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

  var timeout = 15 /** seconds */
  if (options.timeout) {
    timeout = options.timeout
  }
  args = args.concat('--timeout', String(timeout), '-O', dest, url)
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

/**
 *
 * @private
 * @param {string} urlStr
 * @param {module:@yoda/ota~FetchImageSizeCallback} callback
 */
function fetchImageSize (urlStr, callback) {
  var urlObj = Url.parse(urlStr)
  /**
   * @type {http}
   */
  var handler
  switch (urlObj.protocol) {
    case 'http:':
      handler = http
      break
    case 'https:':
      handler = https
      break
    default:
      throw new Error(`Not supported protocol ${urlObj.protocol} on fetch ota image size`)
  }
  var req = handler.request(
    Object.assign({}, urlObj, {
      method: 'HEAD',
      timeout: 1000
    }),
    (res) => {
      res.on('error', callback)
      res.destroy(null)

      var headers = res.headers
      var contentLengthStr = headers['content-length']
      var contentLength = Number(contentLengthStr)
      if (isNaN(contentLength)) {
        callback(new Error(`Failed to fetch ota image size. Got ${contentLengthStr}`))
        return
      }
      callback(null, contentLength)
    }) /** req.on('response') */
  req.end()
}
