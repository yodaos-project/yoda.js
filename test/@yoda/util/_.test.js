var test = require('tape')
var _ = require('@yoda/util')._

var suites = [
  {
    title: 'should get value',
    target: { foo: 'bar' },
    path: 'foo',
    defaults: undefined,
    expected: 'bar'
  },
  {
    title: 'should get nested value',
    target: { nested: { foo: 'bar' } },
    path: 'nested.foo',
    defaults: undefined,
    expected: 'bar'
  },
  {
    title: 'should get default value',
    target: {},
    path: 'foo',
    defaults: 'bar',
    expected: 'bar'
  },
  {
    title: 'should get array item',
    target: [ 'foo', 'bar' ],
    path: '1',
    defaults: undefined,
    expected: 'bar'
  },
  {
    title: 'should get array item by index',
    target: [ 'foo', 'bar' ],
    path: 1,
    defaults: undefined,
    expected: 'bar'
  },
  {
    title: 'should break if get nil in the middle of nested object',
    target: { nested: { foo: { foo: 'bar' } } },
    path: 'nested.bar.foo',
    defaults: undefined,
    expected: undefined
  },
  {
    title: 'should tolerant literal values',
    target: { foo: 1 },
    path: 'foo.bar',
    defaults: undefined,
    expected: undefined
  },
  {
    title: 'should break on null',
    target: { foo: null },
    path: 'foo.bar',
    defaults: undefined,
    expected: null
  }
]

suites.forEach(it => {
  test(it.title, t => {
    t.doesNotThrow(() => t.strictEqual(_.get(it.target, it.path, it.defaults), it.expected))
    t.end()
  })
})
