var test = require('tape')

var bootstrap = require('../../bootstrap')

test('should register notifications', t => {
  t.plan(2)
  var tt = bootstrap()
  var loader = tt.component.appLoader

  loader.registerNotificationChannel('foobar')
  t.deepEqual(loader.notifications['foobar'], [])
  loader.reload()
  t.deepEqual(loader.notifications['foobar'], [])
})

test('should generate app secret', t => {
  var tt = bootstrap()
  var loader = tt.component.appLoader

  t.throws(() => {
    loader.getAppSecret('test')
  }, 'Unknown app test')
  loader.appManifests['test'] = {}
  var secret = loader.getAppSecret('test')
  t.strictEqual(typeof secret, 'string')
  t.strictEqual(loader.verifyAndDecryptAppSecret(secret), 'test')

  t.end()
})

test('should reject app secret', t => {
  var tt = bootstrap()
  var loader = tt.component.appLoader

  t.strictEqual(loader.verifyAndDecryptAppSecret('foo'), false)
  t.strictEqual(loader.verifyAndDecryptAppSecret(123), false)
  t.strictEqual(loader.verifyAndDecryptAppSecret(''), false)

  loader.appManifests['test'] = {}
  var secret = loader.getAppSecret('test')
  t.strictEqual(loader.verifyAndDecryptAppSecret(secret + '123'), false)
  t.strictEqual(loader.verifyAndDecryptAppSecret('test:123'), false)

  t.end()
})
