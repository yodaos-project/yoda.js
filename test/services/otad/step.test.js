var test = require('tape')

var mock = require('../../helper/mock')
var helper = require('../../helper')
var Delegation = require(`${helper.paths.runtime}/services/otad/delegation`)
var ota = require(`${helper.paths.runtime}/services/otad/step`)
var wget = require(`${helper.paths.runtime}/services/otad/wget`)
var system = require('@yoda/system')

test('should skip ota if runtime is not ready', t => {
  var delegation = new Delegation()
  mock.mockPromise(require('@yoda/flora/disposable'), 'once', null, [ 'setup' ])
  mock.mockCallback(delegation, 'fetchOtaInfo', function () {
    t.fail('unreachable path')
  })
  ota.runInCurrentContext(delegation, function onOTA (err, info) {
    t.error(err)
    t.assert(info == null)

    mock.restore()
    t.end()
  })
})

test('should ship ota if no updates available', t => {
  var delegation = new Delegation()
  mock.mockCallback(delegation, 'prelude', null, true)
  mock.mockCallback(delegation, 'fetchOtaInfo', null, {/** Nothing */})
  ota.runInCurrentContext(delegation, function onOTA (err, info) {
    t.error(err)
    t.assert(info == null)

    mock.restore()
    t.end()
  })
})

test('should throw if disk space not available', t => {
  var delegation = new Delegation()
  mock.mockCallback(delegation, 'prelude', null, true)
  mock.mockCallback(delegation, 'fetchOtaInfo', null, {
    imageUrl: 'https://example.com',
    version: 'foobar',
    integrity: '99d7bdf3ecf03f3fd081d7b835c7347f'
  })

  mock.mockCallback(wget, 'fetchImageSize', null, 1024 * 1024 * 1024 * 1024 /** 1T */)
  mock.mockCallback(wget, 'download', () => {
    t.fail('unreachable path')
  })

  mock.mockReturns(system, 'diskUsage', (path) => {
    t.ok(/\/data\/upgrade/.test(path), path)
    return {
      available: 100 /** 100 Bytes */
    }
  })
  ota.runInCurrentContext(delegation, function onOTA (err, info) {
    t.throws(() => { throw err }, 'Disk space not available')
    t.assert(info == null)

    mock.restore()
    t.end()
  })
})

test('should download image and validate checksum', t => {
  var delegation = new Delegation()
  mock.mockCallback(delegation, 'checkIntegrity', null, '99d7bdf3ecf03f3fd081d7b835c7347f')
  mock.mockCallback(wget, 'download', null, null)
  ota.downloadImage(delegation, {
    imageUrl: 'https://example.com',
    version: 'foobar',
    integrity: '99d7bdf3ecf03f3fd081d7b835c7347f'
  }, function onDownload (err, result) {
    t.error(err)
    t.ok(result)

    mock.restore()
    t.end()
  })
})
