var test = require('tape')
var EventEmitter = require('events')
var SequentialFlow = require('@yodaos/application').vui.SequentialFlow

var mm = require('../../../helper/mock')

function bootstrap () {
  mm.restore()
  var api = {
    audioFocus: new EventEmitter()
  }
  global[Symbol.for('yoda#api')] = api
  mm.mockPromise(api.audioFocus, 'request', function (it) {
    api.audioFocus.emit('gain', it.id)
  })
}

test('sequential flow should run each item sequentially', t => {
  bootstrap()

  var expectSequence = [ 1.1, 1, 2.1, 2, 3.1, 3 ]
  var sequence = []
  var sf = new SequentialFlow([
    next => {
      sequence.push(1.1)
      setTimeout(() => {
        sequence.push(1)
        next()
      }, 50)
    },
    next => {
      sequence.push(2.1)
      setTimeout(() => {
        sequence.push(2)
        next()
      }, 10)
    },
    next => {
      sequence.push(3.1)
      setTimeout(() => {
        sequence.push(3)
        next()
      }, 25)
    }
  ])
  sf.on('end', () => {
    t.deepEqual(sequence, expectSequence)
    t.end()
  })

  sf.start()
})
