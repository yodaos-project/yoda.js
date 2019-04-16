var test = require('tape')

var delegate = require('@yoda/util').delegate

test('should delegate method', t => {
  var proto = {}
  var target = {
    foo: () => 'bar'
  }
  delegate(proto, 'target')
    .method('foo')

  t.throws(() => {
    proto.foo()
  }, TypeError)
  proto.target = target
  t.strictEqual(proto.foo(), 'bar')
  t.end()
})

test('should delegate getter', t => {
  var proto = {}
  var target = {
    foo: 'bar'
  }
  Object.defineProperty(target, 'bar', {
    enumerable: true,
    configurable: true,
    get: () => 'foo'
  })
  delegate(proto, 'target')
    .getter('foo')
    .getter('bar')

  t.throws(() => {
    // eslint-disable-next-line
    proto.foo
  }, TypeError)
  t.throws(() => {
    // eslint-disable-next-line
    proto.bar
  }, TypeError)
  proto.target = target
  t.strictEqual(proto.foo, 'bar')
  t.strictEqual(proto.bar, 'foo')
  t.end()
})
