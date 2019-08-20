var test = require('tape')
var EventEmitter = require('events')
var AtomicTask = require('@yodaos/application').vui.AtomicTask

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
  mm.mockPromise(api.audioFocus, 'abandon', function (it) {
  })
}

test('begin test app task', t => {
  bootstrap()

  t.plan(5)

  var index = -1
  var quarkTasks = new Array(3)
  quarkTasks[0] = (onQuarkTaskExecutedCallback) => {
    setTimeout(() => {
      index++
      t.equal(index, 1)
      onQuarkTaskExecutedCallback()
    }, 1000)
  }
  quarkTasks[1] = (onQuarkTaskExecutedCallback) => {
    setTimeout(() => {
      index++
      t.equal(index, 2)
      onQuarkTaskExecutedCallback()
    }, 1000)
  }
  quarkTasks[2] = (onQuarkTaskExecutedCallback) => {
    setTimeout(() => {
      index++
      t.equal(index, 3)
      onQuarkTaskExecutedCallback()
    }, 1000)
  }

  var testAtomicTask = new AtomicTask(
    (onTaskPreparedCallback) => {
      index++
      t.equal(index, 0)
      onTaskPreparedCallback()
    },
    (isInterrupted) => {
      t.equal(index, quarkTasks.length)
    },
    quarkTasks,
    'test-atomic-task'
  )
  testAtomicTask.execute()
})
