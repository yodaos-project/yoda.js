var createHarness = require('tape').createHarness
var test = createHarness({ autoclose: /** automatically emit test results on finish */true })

test.createStream().on('data', row => {
  row.toString().trim().split('\n').forEach(it => require('logger').syslog(`${it}\n`))
})
module.exports.test = function () {
  return test.apply(test, arguments)
}

module.exports.beforeEach = function beforeEach (test, before) {
  return function nested (name, options, exec) {
    if (typeof options === 'function') {
      exec = options
      options = undefined
    }
    test(name, options, function (t) {
      var _end = t.end
      t.end = function () {
        t.end = _end
        exec(t)
      }

      before(t)
    })
  }
}

module.exports.afterEach = function afterEach (test, after) {
  return function nested (name, options, exec) {
    if (typeof options === 'function') {
      exec = options
      options = undefined
    }
    test(name, function (assert) {
      var _end = assert.end
      assert.end = function () {
        assert.end = _end
        after(assert)
      }

      exec(assert)
    })
  }
}
