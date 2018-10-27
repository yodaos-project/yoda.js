'use strict'

var test = require('tape')
var httpsession = require('@yoda/httpsession')

test('https post', (t) => {
  var options = {
    method: 'POST',
    body: 'hello',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'text/plain'
    }
  }
  httpsession.request('https://httpbin.org/post', options, (error, resp) => {
    t.equal(typeof error, 'undefined', 'the error should be undefined')
    t.equal(resp.code, 200, 'the status code should be 200')
    var body = JSON.parse(resp.body)
    t.equal(body.data, 'hello', 'the body should be "hello"')
    t.end()
  })
})

test('https get', (t) => {
  var options = {
    headers: {
      Accept: 'application/json'
    }
  }
  httpsession.request('https://httpbin.org/get?what=hello', options, (error, resp) => {
    t.equal(typeof error, 'undefined', 'the error should be undefined')
    t.equal(resp.code, 200, 'the status code should be 200')
    var body = JSON.parse(resp.body)
    t.equal(body.args.what, 'hello', 'query args should be returned')
    t.end()
  })
})

test('https status code', (t) => {
  httpsession.request('https://httpbin.org/status/256', null, (error, resp) => {
    t.equal(typeof error, 'undefined', 'the error should be undefined')
    t.equal(resp.code, 256, 'the status code should be 256')
    httpsession.abort()
    t.end()
  })
})
