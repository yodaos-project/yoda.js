var test = require('tape')
var EventEmitter = require('events')
var path = require('path')

test('simple app integration', t => {
  t.plan(1)

  var api = new EventEmitter()
  api.appHome = path.join(__dirname, './fixture/simple-app')
  global[Symbol.for('yoda#api')] = api
  api.exit = () => {
    t.pass('integration done')
  }

  require('./fixture/simple-app/app')
  api.emit('url', 'yoda-app://foo')
  t.end()
})
