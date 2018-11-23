'use strict'

var test = require('tape')
var _ = require('@yoda/util')._

test('should pass normal singleton', t => {
  var called = 0
  var lockedErrorThrown = 0
  var fn = _.singleton(() => {
    return new Promise((resolve) => {
      called += 1
      setTimeout(resolve, 500)
    })
  })

  for (var i = 0; i < 50; i++) {
    fn().catch((_) => {
      lockedErrorThrown += 1
    })
  }
  t.equal(called, 1, '50 calls always get 1 called')

  setTimeout(() => {
    fn()
    t.equal(lockedErrorThrown, 49, '50 calls generate 49 locked errors')
    t.equal(called, 2, 'get 1 called after the promise is returned')
    t.end()
  }, 500)
})

test('should pass result singleton', t => {
  var result = 0
  var called = 0
  var lockedErrorThrown = 0
  var add = _.singleton((arg1, arg2) => {
    return new Promise((resolve) => {
      called += 1
      setTimeout(() => resolve(arg1 + arg2), 500)
    })
  })

  for (var i = 0; i < 50; i++) {
    add(100, i).then((sum) => {
      result = sum
    }, (_) => {
      lockedErrorThrown += 1
    })
  }
  t.equal(called, 1, '50 calls always get 1 called')

  setTimeout(() => {
    t.equal(result, 100, 'should only works on first slot')
    t.equal(lockedErrorThrown, 49, '50 calls generate 49 locked errors')
    t.end()
  }, 500)
})

test('should test reject with singleton', t => {
  var called = 0
  var throws = 0
  var lockedErrorThrown = 0
  var fn = _.singleton(() => {
    return new Promise((resolve, reject) => {
      called += 1
      setTimeout(() => {
        reject(new Error('test'))
      }, 500)
    })
  })

  for (var i = 0; i < 50; i++) {
    fn().catch((err) => {
      if (err.message === 'test') {
        throws += 1
      } else {
        lockedErrorThrown += 1
      }
    })
  }
  t.equal(called, 1, '50 calls always get 1 called')

  setTimeout(() => {
    t.equal(lockedErrorThrown, 49, '50 calls generate 49 locked errors')
    t.equal(throws, 1, '50 calls generate 1 test error')
    t.end()
  }, 500)
})
