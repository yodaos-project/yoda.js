var test = require('tape')
var bootstrap = require('./bootstrap')
var mm = require('../../helper/mock')

test('open url with format', t => {
  t.plan(3)
  var suite = bootstrap()
  mm.mockPromise(suite.runtime, 'openUrl', (url) => {
    t.deepEqual(url, {
      protocol: 'yoda-app:',
      slashes: true,
      auth: null,
      host: 'foobar',
      port: null,
      hostname: 'foobar',
      hash: null,
      search: '',
      query: {
        key: '?name',
        number: '123',
        'arbitrary-value': '123,123'
      },
      pathname: null,
      path: null,
      href: 'yoda-app://foobar'
    })
  })
  suite.floraCall('yodaos.runtime.open-url-format', ['yoda-app://foobar', ['key', '?name'], ['number', 123], ['arbitrary-value', ['123', 123]]])
    .then(res => {
      t.strictEqual(res.code, 0)
      t.strictEqual(res.msg[0], '{"ok":true}')
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
