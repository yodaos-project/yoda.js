var test = require('tape')
var path = require('@yoda/util').path

var suites = [
  {
    fn: 'transformPathScheme',
    cases: [
      {
        title: 'should transform system uri',
        params: [
          'system:///foobar',
          '/opt'
        ],
        expected: '/opt/foobar'
      },
      {
        title: 'should transform system uri without leading slash',
        params: [
          'system://foobar',
          '/opt'
        ],
        expected: '/opt/foobar'
      },
      {
        title: 'should transform app uri',
        params: [
          'self:///foobar',
          '/opt',
          '/app'
        ],
        expected: '/app/foobar'
      },
      {
        title: 'should transform app uri without leading slash',
        params: [
          'self://foobar',
          '/opt',
          '/app'
        ],
        expected: '/app/foobar'
      },
      {
        title: 'should transform to app uri',
        params: [
          '/foobar',
          '/opt',
          '/app'
        ],
        expected: '/app/foobar'
      },
      {
        title: 'should not transform absolute path if appHome is empty',
        params: [
          '/foobar',
          '/opt',
          ''
        ],
        expected: '/foobar'
      }
    ]
  }
]

suites.forEach(suite => {
  var fn = suite.fn
  suite.cases.forEach(esac => {
    test(`${fn}: ${esac.title}`, t => {
      t.doesNotThrow(() => t.deepEqual(path[fn].apply(null, esac.params), esac.expected))
      t.end()
    })
  })
})
