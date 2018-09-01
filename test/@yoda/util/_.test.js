var test = require('tape')
var _ = require('@yoda/util')._

var suites = [
  {
    fn: 'get',
    cases: [
      {
        title: 'should get value',
        params: [
          { foo: 'bar' },
          'foo',
          undefined
        ],
        expected: 'bar'
      },
      {
        title: 'should get nested value',
        params: [
          { nested: { foo: 'bar' } },
          'nested.foo',
          undefined
        ],
        expected: 'bar'
      },
      {
        title: 'should get default value',
        params: [
          {},
          'foo',
          'bar'
        ],
        expected: 'bar'
      },
      {
        title: 'should get array item',
        params: [
          [ 'foo', 'bar' ],
          '1',
          undefined
        ],
        expected: 'bar'
      },
      {
        title: 'should get array item by index',
        params: [
          [ 'foo', 'bar' ],
          1,
          undefined
        ],
        expected: 'bar'
      },
      {
        title: 'should break if get nil in the middle of nested object',
        params: [
          { nested: { foo: { foo: 'bar' } } },
          'nested.bar.foo',
          undefined
        ],
        expected: undefined
      },
      {
        title: 'should tolerant literal values',
        params: [
          { foo: 1 },
          'foo.bar',
          undefined
        ],
        expected: undefined
      },
      {
        title: 'should break on null',
        params: [
          { foo: null },
          'foo.bar',
          undefined
        ],
        expected: null
      }
    ]
  },
  {
    fn: 'pick',
    cases: [
      {
        title: 'should get keys',
        params: [
          { foo: 'bar', bar: 'foo' },
          'foo'
        ],
        expected: { foo: 'bar' }
      },
      {
        title: 'should skip if target is nil',
        params: [
          null,
          'foo'
        ],
        expected: null
      }
    ]
  }
]

suites.forEach(suite => {
  var fn = suite.fn
  suite.cases.forEach(esac => {
    test(`${fn}: ${esac.title}`, t => {
      t.doesNotThrow(() => t.deepEqual(_[fn].apply(null, esac.params), esac.expected))
      t.end()
    })
  })
})
