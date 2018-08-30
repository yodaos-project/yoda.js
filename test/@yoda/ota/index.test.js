'use strict'

var test = require('tape')
var path = require('path')
var fs = require('fs')
var ota = require('@yoda/ota')
var property = require('@yoda/property')
var otaNetwork = require('@yoda/ota/network')
var mock = require('../../helper/mock')

var upgradeDir = path.join(__dirname, '..', '..', 'fixture', 'upgrade')
ota.upgradeDir = upgradeDir

var dumpFile = path.join(__dirname, '..', '..', 'fixture', 'tobeornottobe.txt')
var imgFile = path.join(upgradeDir, '99d7bdf3ecf03f3fd081d7b835c7347f.img')

function tryUnlinkSync (file) {
  try {
    fs.unlinkSync(file)
  } catch (e) {}
}

tryUnlinkSync(imgFile)

function mockPropertyGet (noota) {
  var get = property.get
  mock.mockReturns(property, 'get', function mockGet (key) {
    if (key === 'persist.sys.rokid.noota') {
      return noota
    }
    return get.call(property, key)
  })
}

test('should skip ota if noota is set', t => {
  mockPropertyGet('YES')
  mock.mockCallback(otaNetwork, 'fetchOtaInfo', function () {
    t.fail('unreachable path')
  })
  ota.runInCurrentContext(function onOTA (err, info) {
    t.error(err)
    t.assert(info == null)

    mock.restore()
    t.end()
  })
})

test('should ship ota if no updates available', t => {
  mockPropertyGet()
  mock.mockCallback(otaNetwork, 'fetchOtaInfo', null, { code: 'NO_IMAGE' })
  ota.runInCurrentContext(function onOTA (err, info) {
    t.error(err)
    t.assert(info == null)

    mock.restore()
    t.end()
  })
})

test('should throw if disk space not available', t => {
  mockPropertyGet()
  mock.mockCallback(otaNetwork, 'fetchOtaInfo', null, {
    imageUrl: 'https://example.com',
    version: 'foobar',
    checksum: '99d7bdf3ecf03f3fd081d7b835c7347f'
  })
  mock.mockCallback(otaNetwork, 'fetchImageSize', null, 1024 * 1024 * 1024 * 1024 /** 1T */)
  ota.runInCurrentContext(function onOTA (err, info) {
    t.ok(err)
    t.ok(err.message.match('Disk space not available'))

    mock.restore()
    t.end()
  })
})

test('should download image and validate checksum', t => {
  mockPropertyGet()
  mock.mockCallback(otaNetwork, 'fetchImageSize', null, 1024 /** 1K, don't care */)
  mock.mockCallback(otaNetwork, 'doDownloadImage', function mockDoDownloadImage (imgUrl, dest, options, callback) {
    /** no implementation of fs.copyFile, and there is a buf in fs.createWriteStream */
    fs.readFile(dumpFile, (err, data) => {
      if (err) {
        return callback(err)
      }
      fs.writeFile(dest, data, (err) => {
        if (err) {
          return callback(err)
        }
        callback()
      })
    })
  })
  ota.downloadImage({
    imageUrl: 'https://example.com',
    version: 'foobar',
    checksum: '99d7bdf3ecf03f3fd081d7b835c7347f'
  }, function onDownload (err, result) {
    t.error(err)
    t.ok(result)

    mock.restore()
    tryUnlinkSync(imgFile)
    t.end()
  })
})

test('should skip download if image already exists', t => {
  mockPropertyGet()
  /** no implementation of fs.copyFile, and there is a buf in fs.createWriteStream */
  fs.readFile(dumpFile, (err, data) => {
    if (err) {
      t.error(err)
      return t.end()
    }
    fs.writeFile(imgFile, data, (err) => {
      if (err) {
        t.error(err)
        return t.end()
      }
      onTest()
    })
  })

  function onTest () {
    mock.mockCallback(otaNetwork, 'fetchOtaInfo', null, {
      imageUrl: 'https://example.com',
      version: 'foobar',
      checksum: '99d7bdf3ecf03f3fd081d7b835c7347f'
    })
    mock.mockCallback(otaNetwork, 'fetchImageSize', null, 1024 /** 1K, dont care */)
    mock.mockCallback(otaNetwork, 'doDownloadImage', () => {
      t.fail('unreachable path')
    })
    ota.runInCurrentContext(function onOTA (err, info) {
      t.error(err)
      t.strictEqual(info && info.imagePath, imgFile)
      t.strictEqual(info && info.status, 'downloaded')

      mock.restore()
      tryUnlinkSync(imgFile)
      t.end()
    })
  }
})
