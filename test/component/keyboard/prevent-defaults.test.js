var test = require('tape')
var EventEmitter = require('events')

var AppRuntime = require('../../helper/mock-runtime')
var mm = require('../../helper/mock')

test('shall prevent default', t => {
  t.plan(1)
  var runtime = new AppRuntime()
  var keyboard = runtime.component.keyboard
  var descriptor = runtime.descriptor.keyboard

  mm.mockReturns(descriptor, 'handleAppListener', true)
  mm.mockPromise(runtime, 'openUrl', () => {
    t.fail('unreachable path')
  })

  keyboard.input = new EventEmitter()
  keyboard.listen()

  keyboard.config = {
    '233': {
      click: {
        url: 'foobar://example.com'
      }
    }
  }

  keyboard.input.emit('click', { keyCode: 233 })
  t.pass()
  t.end()
})
