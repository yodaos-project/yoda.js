var test = require('tape')
var EventEmitter = require('events')

var mock = require('../../helper/mock')

var _ = require('@yoda/util')._
var ContextManager = require('@yodaos/application/context-manager')

test('should emit context on request', t => {
  t.plan(4)

  var activity = new EventEmitter()
  mock.mockPromise(activity, 'exit', () => {
    t.pass('activity exited')
  })

  var cm = new ContextManager(activity)
  var nlp = { intent: 'foo' }
  var action = { foo: 'bar' }
  cm.on('request', ctx => {
    t.deepEqual(ctx.nlp, nlp)
    t.deepEqual(ctx.action, action)
    t.strictEqual(typeof ctx.exit, 'function')
    ctx.exit()
  })
  activity.emit('request', nlp, action)
})

test('should emit context on url', t => {
  t.plan(3)

  var activity = new EventEmitter()
  mock.mockPromise(activity, 'exit', () => {
    t.pass('activity exited')
  })

  var cm = new ContextManager(activity)
  var url = { href: 'foobar' }
  cm.on('url', ctx => {
    t.deepEqual(ctx.urlObj, url)
    t.strictEqual(typeof ctx.exit, 'function')
    ctx.exit()
  })
  activity.emit('url', url)
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

test('should pass through exit arguments', t => {
  t.plan(2)

  var activity = new EventEmitter()
  activity.exit = function () {
    t.strictEqual(cm.contexts.length, 0)
    t.deepEqual(Array.prototype.slice.call(arguments), [ { clearContexts: true } ])
  }

  var cm = new ContextManager(activity)
  var nlp = { intent: 'foo' }
  var action = { foo: 'bar' }

  cm.on('request', ctx => {
    setTimeout(() => ctx.exit({ clearContexts: true }), 1000)
  })
  _.times(10).forEach(() => activity.emit('request', nlp, action))
})
