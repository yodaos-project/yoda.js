var test = require('tape')
var LRU = require('lru-cache')

test('should set/get items', t => {
  var lru = new LRU(1)
  t.strictEqual(lru.get('foo'), undefined)
  lru.set('foo', 'bar')
  t.strictEqual(lru.get('foo'), 'bar')
  lru.set('bar', 'foo')
  t.strictEqual(lru.get('bar'), 'foo')
  t.strictEqual(lru.get('foo'), undefined)
  t.end()
})
