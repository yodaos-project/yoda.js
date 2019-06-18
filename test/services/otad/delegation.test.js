var test = require('tape')
var path = require('path')

var helper = require('../../helper')
var mm = require('../../helper/mock')
var Delegation = require(`${helper.paths.runtime}/services/otad/delegation`)

test('should return default prelude', t => {
  var delegate = new Delegation()
  mm.mockPromise(require('@yoda/flora/disposable'), 'once', null, [ 'ready' ])
  delegate.prelude((err, result) => {
    t.error(err)
    t.deepEqual(result, true)
    t.end()
  })
})

test('should delegate fetchOtaInfo to required js modules', t => {
  var delegate = new Delegation([ '--require', '--fetcher', path.resolve(__dirname, 'fixture/fetcher.js') ])
  delegate.fetchOtaInfo('foobar', (err, result) => {
    t.error(err)
    t.deepEqual(result, {
      imageUrl: 'https://example.com',
      version: '2.3.3',
      integrity: 'foobar'
    })
    t.end()
  })
})

test('should delegate fetchOtaInfo to executable', t => {
  var delegate = new Delegation([ '--fetcher', `${process.argv[0]} ${path.resolve(__dirname, 'fixture/fetcher.js')}` ])
  delegate.fetchOtaInfo('foobar', (err, result) => {
    t.error(err)
    t.deepEqual(result, {
      imageUrl: 'https://example.com',
      version: '2.3.3',
      integrity: 'foobar'
    })
    t.end()
  })
})

test('should delegate fetchOtaInfo to echo', t => {
  var expected = {
    imageUrl: 'https://example.com',
    version: '2.3.3',
    integrity: 'foobar'
  }
  var delegate = new Delegation([ '--fetcher', `echo "${JSON.stringify(expected).replace(/"/g, '\\"')}"; #` ])
  delegate.fetchOtaInfo('foobar', (err, result) => {
    t.error(err)
    t.deepEqual(result, expected)
    t.end()
  })
})

test('should delegate checkIntegrity to executable', t => {
  var delegate = new Delegation([ '--integrity', `${path.join(__dirname, 'fixture/md5check.sh')}` ])
  delegate.checkIntegrity(path.join(helper.paths.fixture, 'tobeornottobe.txt'), '99d7bdf3ecf03f3fd081d7b835c7347f', (err, result) => {
    t.error(err)
    t.deepEqual(result, true)
    t.end()
  })
})

test('should delegate checkIntegrity to shell command', t => {
  var delegate = new Delegation([ '--integrity', `bash -c 'printf "$1  $0" | md5sum -c' ` ])
  delegate.checkIntegrity(path.join(helper.paths.fixture, 'tobeornottobe.txt'), '99d7bdf3ecf03f3fd081d7b835c7347f', (err, result) => {
    t.error(err)
    t.deepEqual(result, true)
    t.end()
  })
})

test('should delegate checkIntegrity to executable and fail the check', t => {
  var delegate = new Delegation([ '--integrity', `${path.join(__dirname, 'fixture/md5check.sh')}` ])
  delegate.checkIntegrity(path.join(helper.paths.fixture, 'tobeornottobe.txt'), 'foobar', (err, result) => {
    t.throws(() => { throw err }, /Error: Command failed/)
    t.deepEqual(result, false)
    t.end()
  })
})

test('should delegate notify to executable', t => {
  t.plan(2)
  var delegate = new Delegation([ '--notify', `echo` ])
  mm.mockCallback(require('child_process'), 'exec', (command, callback) => {
    t.strictEqual(command, 'echo 1.0.0 /data/path')
    callback(null, '')
  })
  delegate.notify('1.0.0', '/data/path', (err) => {
    t.error(err)
    mm.restore()
    t.end()
  })
})

test('should delegate notify to executable with no version and imagePath', t => {
  t.plan(2)
  var delegate = new Delegation([ '--notify', `echo` ])
  mm.mockCallback(require('child_process'), 'exec', (command, callback) => {
    t.strictEqual(command, 'echo  ')
    callback(null, '')
  })
  delegate.notify(null, null, (err) => {
    t.error(err)
    mm.restore()
    t.end()
  })
})

test('should delegate notify to executable and throws on not found', t => {
  var delegate = new Delegation([ '--notify', `foo` ])
  delegate.notify('1.0.0', '/data/path', (err) => {
    t.throws(() => { throw err }, /Error: Command failed/)
    t.end()
  })
})
