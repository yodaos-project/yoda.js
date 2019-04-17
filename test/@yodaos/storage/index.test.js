var test = require('tape')
var path = require('path')
var Storage = require('@yodaos/storage')

test('duplicate construction on same path', t => {
  new Storage(path.join(__dirname, '..', '..', 'temp', 'foo')) // eslint-disable-line
  new Storage(path.join(__dirname, '..', '..', 'temp', 'foo')) // eslint-disable-line
  t.end()
})

test('storage path conflicts', t => {
  t.throws(() => {
    new Storage(path.join(__dirname, '..', '..', 'temp', '.gitkeep')) // eslint-disable-line
  }, 'Storage path conflicts.')
  t.end()
})

test('get/set/remove items', t => {
  var storage = new Storage(path.join(__dirname, '..', '..', 'temp', 'case'))
  storage.clear()
  t.strictEqual(storage.getItem('foo'), null)
  t.strictEqual(storage.setItem('foo', 123), undefined)
  t.strictEqual(storage.getItem('foo'), '123')
  t.strictEqual(storage.removeItem('foo'), undefined)
  t.strictEqual(storage.getItem('foo'), null)

  t.end()
})

test('clear items', t => {
  var storage = new Storage(path.join(__dirname, '..', '..', 'temp', 'case'))
  storage.clear()
  t.strictEqual(storage.setItem('foo', 123), undefined)
  t.strictEqual(storage.setItem('bar', undefined))
  t.strictEqual(storage.clear())
  t.strictEqual(storage.getItem('foo'), null)
  t.strictEqual(storage.getItem('bar'), null)
  t.end()
})

test('multiple storage on same path', t => {
  var storage = new Storage(path.join(__dirname, '..', '..', 'temp', 'case'))
  t.strictEqual(storage.setItem('foo', 123), undefined)
  storage = new Storage(path.join(__dirname, '..', '..', 'temp', 'case'))
  t.strictEqual(storage.getItem('foo'), '123')

  t.end()
})

test('remove items', t => {
  var storage = new Storage(path.join(__dirname, '..', '..', 'temp', 'case'))
  t.strictEqual(storage.removeItem('a-definitely-unknown-key'), undefined)
  t.end()
})
