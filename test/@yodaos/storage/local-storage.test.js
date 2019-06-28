var test = require('tape')
var mm = require('../../helper/mock')
var fs = require('fs')
var Storage = require('@yodaos/storage')

test('should create local storage in /data/AppData', t => {
  global[Symbol.for('yoda#api')] = { appId: 'foobar' }
  mm.mockReturns(fs, 'mkdirSync')
  t.ok(Storage.localStorage instanceof Storage)
  t.strictEqual(Storage.localStorage.appDataDir, '/data/AppData/foobar')
  t.end()
  mm.restore()
})
