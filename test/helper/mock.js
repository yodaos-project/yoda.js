'use strict'

var mockContext = []

function mockReturns (target, prop, ret) {
  var orig = target[prop]
  target[prop] = mocking
  mockContext.push({
    target: target,
    prop: prop,
    orig: orig
  })

  function mocking () {
    if (typeof ret === 'function') {
      return ret.apply(target, arguments)
    }
    return ret
  }
}

function mockCallback (target, prop, err, res) {
  var orig = target[prop]
  target[prop] = mocking
  mockContext.push({
    target: target,
    prop: prop,
    orig: orig
  })

  function mocking () {
    var argc = arguments.length
    var callback = arguments[argc - 1]
    process.nextTick(() => {
      if (typeof err === 'function') {
        return err.apply(null, arguments)
      }
      callback(err, res)
    })
  }
}

function mockPromise (target, prop, err, res) {
  var orig = target[prop]
  target[prop] = mocking
  mockContext.push({
    target: target,
    prop: prop,
    orig: orig
  })

  function mocking () {
    if (typeof err === 'function') {
      return Promise.resolve(err.apply(target, arguments))
    }
    if (err != null) {
      return Promise.reject(err)
    }
    return Promise.resolve(res)
  }
}

function restore () {
  mockContext.forEach(it => {
    it.target[it.prop] = it.orig
  })
  mockContext = []
}

module.exports.mockReturns = mockReturns
module.exports.mockCallback = mockCallback
module.exports.mockPromise = mockPromise
module.exports.restore = restore
