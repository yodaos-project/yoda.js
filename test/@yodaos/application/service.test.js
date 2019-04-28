var test = require('tape')
var EventEmitter = require('events')
var path = require('path')

var yodaos = require('@yodaos/application')
var symbol = require('@yodaos/application/symbol')

test('start/finish service', t => {
  t.plan(3)

  var api = new EventEmitter()
  api.appHome = path.join(__dirname, '../../fixture/noop-app')
  api.exit = function () {
    t.pass('should exit app process on no task available')
  }

  var application = yodaos.Application({}, api)
  var service = yodaos.Service({
    created: function () {
      t.pass('service should be created')
      this.finish()
    },
    destroyed: function () {
      t.pass('service should be destroyed')
    }
  }, api)
  service[symbol.componentName] = 'foo'
  application[symbol.registry].service['foo'] = { mod: service }

  application.startService('foo')
})

test('get service', t => {
  t.plan(1)

  var api = new EventEmitter()
  api.appHome = path.join(__dirname, '../../fixture/noop-app')
  api.exit = function () {
    t.pass('should exit app process on no task available')
  }

  var application = yodaos.Application({}, api)
  var service = yodaos.Service({}, api)
  service[symbol.componentName] = 'foo'
  application[symbol.registry].service['foo'] = { mod: service }

  application.startService('foo')
  var actual = application.getService('foo')
  t.strictEqual(actual, service)
})
