var test = require('tape')
var Url = require('url')

var bootstrap = require('./bootstrap')
var mm = require('../../helper/mock')

test('open url with format', t => {
  t.plan(4)
  var suite = bootstrap()
  mm.mockPromise(suite.runtime, 'openUrl', (url) => {
    t.deepEqual(url, {
      protocol: 'yoda-app:',
      slashes: true,
      auth: 'user:secret',
      host: 'foobar:1234',
      port: '1234',
      hostname: 'foobar',
      hash: '#hash',
      query: {
        foo: 'bar',
        key: '?name',
        number: '123',
        'arbitrary-value': '123,123'
      },
      pathname: '/pathname'
    })
    t.strictEqual(Url.format(url), 'yoda-app://user:secret@foobar:1234/pathname?foo=bar&key=%3Fname&number=123&arbitrary-value=123%2C123#hash')
  })
  suite.floraCall('yodaos.runtime.open-url-format', [
    'yoda-app://user:secret@foobar:1234/pathname?foo=bar#hash',
    ['key', '?name'],
    ['number', 123],
    ['arbitrary-value', ['123', 123]]
  ])
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
