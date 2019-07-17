var test = require('tape')

// var mock = require('../../helper/mock')
var helper = require('../../helper')
var wget = require(`${helper.paths.runtime}/services/otad/wget`)

test('should fetch image size', t => {
  t.plan(2)
  wget.fetchImageSize('http://example.com', (err, imageSize) => {
    t.error(err)
    t.ok(Number.isInteger(imageSize))
  })
})

test('should callback with error if fetching image size failed', t => {
  t.plan(2)
  wget.fetchImageSize('http://definitely-bad-name.onion', (err, imageSize) => {
    t.throws(() => {
      throw err
    }, 'Error: EAI_NONAME')
    t.ok(imageSize == null)
  })
})
