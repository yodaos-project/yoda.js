'use strict'

var mockContext = []

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

function restore () {
  mockContext.forEach(it => {
    it.target[it.prop] = it.orig
  })
  mockContext = []
}

module.exports.mockCallback = mockCallback
module.exports.restore = restore
