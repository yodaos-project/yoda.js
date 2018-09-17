var test = require('tape')
var EventEmitter = require('events')

var helper = require('../../helper')
var Wormhole = require(`${helper.paths.runtime}/lib/component/wormhole`)

test('shall handle messages', t => {
  t.plan(2)

  var runtime = {}
  var wormhole = new Wormhole(runtime)
  var mqttClient = new EventEmitter()
  wormhole.init(mqttClient)

  Wormhole.prototype.handlers = Object.assign({}, {
    test: function (data) {
      t.strictEqual(this, wormhole)
      t.strictEqual(data, 'foobar')
    }
  }, Wormhole.prototype.handlers)

  mqttClient.emit('message', 'test', 'foobar')
})
