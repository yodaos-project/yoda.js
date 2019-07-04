var test = require('tape')
var EventEmitter = require('events')
var path = require('path')
var url = require('url')

var Application = require('@yodaos/application/application')

test('should derive api from global ambient', t => {
  t.plan(1)

  var api = new EventEmitter()
  api.appHome = path.join(__dirname, '../../fixture/noop-app')

  var apiSymbol = Symbol.for('yoda#api')
  global[apiSymbol] = api

  var application = Application({})
  t.strictEqual(application[apiSymbol], api)
})

test('should use given api', t => {
  t.plan(1)

  var api = new EventEmitter()
  api.appHome = path.join(__dirname, '../../fixture/noop-app')

  var apiSymbol = Symbol.for('yoda#api')

  var application = Application({}, api)
  t.strictEqual(application[apiSymbol], api)
})

test('should delegates url events', t => {
  t.plan(1)

  var api = new EventEmitter()
  api.appHome = path.join(__dirname, '../../fixture/noop-app')

  var apiSymbol = Symbol.for('yoda#api')
  global[apiSymbol] = api

  var expectedUrlObj = url.parse('yoda-test://foobar')
  Application({
    url: function url (urlObj) {
      t.deepEqual(urlObj, expectedUrlObj)
    }
  })
  api.emit('url', expectedUrlObj.href)
})

test('should delegates methods', t => {
  t.plan(1)
  var expectedUrl = 'yoda-app://foobar'

  var api = new EventEmitter()
  api.appHome = path.join(__dirname, '../../fixture/noop-app')
  api.openUrl = (url) => {
    t.strictEqual(url, expectedUrl)
  }

  var application = Application({}, api)
  application.openUrl(expectedUrl)
})
