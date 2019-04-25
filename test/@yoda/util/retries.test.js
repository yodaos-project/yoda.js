var test = require('tape')
var retries = require('@yoda/util').retries

test('maxRetries', (t) => {
  t.plan(1)
  var count = 0
  retries.retries(3, (retry, lastly) => {
    count++
    if (lastly) {
      return t.strictEqual(count, 3, 'count must be 3')
    }
    setTimeout(retry, 30)
  })
})

test('retry 1 times', (t) => {
  t.plan(2)
  var count = 0
  retries.retries(3, (retry, lastly) => {
    count++
    t.strictEqual(lastly, false, 'lastly must be false')
    t.strictEqual(count, 1, 'count muse be 1')
  })
})
