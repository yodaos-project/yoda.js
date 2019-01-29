var test = require('tape')
var EventEmitter = require('events')

var mock = require('../../helper/mock')

var _ = require('@yoda/util')._
var ContextManager = require('@yodaos/application/context-manager')

test('should emit context on request', t => {
  t.plan(3)

  var activity = new EventEmitter()
  mock.mockPromise(activity, 'exit', () => {
    t.pass('activity exited')
  })

  var cm = new ContextManager(activity)
  var nlp = { intent: 'foo' }
  var action = { foo: 'bar' }
  cm.on('request', ctx => {
    t.strictEqual(ctx.nlp, nlp)
    t.strictEqual(ctx.action, action)
    t.strictEqual(typeof ctx.exit, 'function')
  })
  activity.emit('request', nlp, action)
})

test('should exit activity while all contexts are exited', t => {
  t.plan(1)

  var activeContexts = 0

  var activity = new EventEmitter()
  mock.mockPromise(activity, 'exit', () => {
    t.strictEqual(activeContexts, 0)
  })

  var cm = new ContextManager(activity)
  var nlp = { intent: 'foo' }
  var action = { foo: 'bar' }

  cm.on('request', ctx => {
    ++activeContexts
    setTimeout(() => {
      --activeContexts
      ctx.exit()
    }, 0)
  })
  _.times(10).forEach(() => activity.emit('request', nlp, action))
})

test('should clear contexts on activity destroy', t => {
  t.plan(1)

  var activity = new EventEmitter()

  var cm = new ContextManager(activity)
  var nlp = { intent: 'foo' }
  var action = { foo: 'bar' }

  _.times(10).forEach(() => activity.emit('request', nlp, action))
  activity.emit('destroy')
  t.strictEqual(cm.contexts.length, 0)
})

test('should memo life status', t => {
  t.plan(5)

  var activity = new EventEmitter()

  var cm = new ContextManager(activity)
  ;['create', 'active', 'pause', 'resume', 'background'].forEach(it => {
    activity.emit(it)
    t.strictEqual(cm.status, it, it)
  })
})
