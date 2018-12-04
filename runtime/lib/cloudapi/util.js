'use strict'

var logger = require('logger')('cloudapi/util')

exports.parseHttpHeader = function parseHttpHeader (text) {
  var lines = text.split('\r\n')
  logger.info('current response is', lines[0])

  var statusLine = lines[0]
  // validate the status line
  var match = statusLine.match(/^HTTP\/([0-9.]+) 200/)
  if (match == null) {
    throw new Error('invalid http header or non-200 status code')
  }

  var httpVersion = match[1] + ''
  if (httpVersion !== '2' &&
    httpVersion !== '1.1' &&
    httpVersion !== '1.0') {
    throw new Error('unsupported http version')
  }

  var headers = {
    version: httpVersion
  }
  for (var i = 1; i < lines.length; i++) {
    var obj = lines[i].split(':')
    var key = obj[0]
    if (typeof obj[1] === 'string') {
      headers[key.toLowerCase()] = lines[i].replace(`${key}:`, '').trim()
    }
  }
  return headers
}
