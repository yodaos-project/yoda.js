'use strict'

var childProcess = require('child_process')
var http = require('http')
var https = require('https')
var url = require('url')

var cloudgw = require('@yoda/cloudgw')

var otaEndpoint = '/v1/extended/ota/check'

/**
 * @private
 * @module @yoda/ota
 */

/**
 *
 * @private
 * @param {string} localVersion
 * @param {module:@yoda/ota~OtaInfoCallback} callback
 */
function fetchOtaInfo (localVersion, callback) {
  cloudgw.request(otaEndpoint,
    { version: localVersion },
    { service: 'ota' },
    function onResponse (err, body) {
      if (err) {
        return callback(err)
      }
      callback(null, body)
    }) /** cloudgw.request */
}

/**
 * @private
 * @typedef DownloadOptions
 * @property {boolean} [noCheckCertificate]
 * @property {boolean} [continue]
 */

/**
 *
 * @private
 * @param {string} url
 * @param {string} dest
 * @param {module:@yoda/ota~DownloadOptions} options
 * @param {Function} callback
 */
function doDownloadImage (url, dest, options, callback) {
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
    callback(err)
  }) /** cp.on('exit') */
}

/**
 * @private
 * @callback FetchImageSizeCallback
 * @param {Error} error
 * @param {number} size
 */

/**
 *
 * @private
 * @param {string} urlStr
 * @param {module:@yoda/ota~FetchImageSizeCallback} callback
 */
function fetchImageSize (urlStr, callback) {
  var urlObj = url.parse(urlStr)
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

module.exports.fetchOtaInfo = fetchOtaInfo
module.exports.doDownloadImage = doDownloadImage
module.exports.fetchImageSize = fetchImageSize
