var childProcess = require('child_process')
var test = require('tape')
var fs = require('fs')

test('little pony shall catch uncaught error', t => {
  t.plan(1)

  var cp = childProcess.fork(`${__dirname}/executor.js`)
  cp.once('exit', (code, signal) => {
    t.strictEqual(code, 0)
    t.end()
  })
})

test('little pony shall catch uncaught error on specfic logfile', t => {
  t.plan(2)

  var cp = childProcess.fork(`${__dirname}/stacktrace.js`)
  cp.once('exit', (code, signal) => {
    t.strictEqual(code, 0)
    var output = fs.readFileSync(process.cwd() + '/test/stacktrace.result', 'utf8')
    t.assert(output.search('Uncaught Exception: Error: foobar') !== -1)
    t.end()
  })
})
