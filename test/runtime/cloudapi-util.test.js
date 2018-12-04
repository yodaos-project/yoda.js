'use strict'

var it = require('tape')
var helper = require('../helper')
var parseHttpHeader = require(`${helper.paths.runtime}/lib/cloudapi/util`).parseHttpHeader

function makeHttpHeader (list) {
  return list.join('\r\n')
}

it('parse http2 headers', (t) => {
  var headers = parseHttpHeader(
    makeHttpHeader([
      'HTTP/2 200',
      'server: nginx/1.12.0',
      'date: Mon, 26 Nov 2018 14:34:44 GMT',
      'content-type: application/json;charset=UTF-8'
    ])
  )
  console.log(headers)
  t.equal(headers.version, '2', 'http version is 2')
  t.equal(headers.server, 'nginx/1.12.0', 'server pass')
  t.equal(headers.date,
    'Mon, 26 Nov 2018 14:34:44 GMT', 'date pass')
  t.equal(headers['content-type'],
    'application/json;charset=UTF-8', 'content-type pass')
  t.end()
})

it('parse http1.1 headers', (t) => {
  var headers = parseHttpHeader(
    makeHttpHeader([
      'HTTP/1.1 200',
      'Server: nginx/1.12.0',
      'Date: Mon, 26 Nov 2018 14:34:44 GMT',
      'Content-Type: application/json;charset=UTF-8'
    ])
  )
  console.log(headers)
  t.equal(headers.version, '1.1', 'http version is 1.1')
  t.equal(headers.server, 'nginx/1.12.0', 'server pass')
  t.equal(headers.date,
    'Mon, 26 Nov 2018 14:34:44 GMT', 'date pass')
  t.equal(headers['content-type'],
    'application/json;charset=UTF-8', 'content-type pass')
  t.end()
})
