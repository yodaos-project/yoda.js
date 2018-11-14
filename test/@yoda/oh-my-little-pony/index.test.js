var childProcess = require('child_process')
var test = require('tape')

test('little pony shall catch uncaught error', t => {
  t.plan(1)

  var cp = childProcess.fork(`${__dirname}/executor.js`)
  cp.once('exit', (code, signal) => {
    t.strictEqual(code, 0)
    t.end()
  })
})
