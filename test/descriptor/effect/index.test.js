'use strict'

var test = require('tape')

var mm = require('../../helper/mock')
var bootstrap = require('../bootstrap')

test('should transform url scheme "self:"', t => {
  t.plan(4)

  var tt = bootstrap()
  Object.defineProperty(tt.component, 'light', { value: {} })
  mm.mockPromise(tt.component.light, 'play', (appId, absPath, args, options) => {
    t.strictEqual(appId, 'test')
    t.strictEqual(absPath, '/data/apps/test/light/foobar.js')
    t.deepEqual(args, {})
    t.deepEqual(options, {})
    return Promise.resolve(/** reply */[ true ])
  })

  var bridge = tt.getBridge({ appId: 'test', appHome: '/data/apps/test' })
  bridge.invoke('effect', 'play', [ 'self://foobar.js' ])
    .then(() => {
      t.end()
    })
    .catch(err => {
      t.error(err)
      t.end()
    })
})
