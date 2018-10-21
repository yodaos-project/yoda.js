'use strict'

var test = require('tape')
var ota = require('@yoda/ota')
var info = {imageUrl: '/test/test',
  authorize: '',
  changelog: 'yyyyyy',
  checksum: 'cbdakbcabcka',
  isForceUpdate: false,
  version: '111111',
  imagePath: '/data/yc/test',
  status: 'downloaded'
}

test('Info should not null,if writeInfo works', t => {
  t.plan(4)
  ota.readInfoAndClear(() => {
    ota.writeInfo(info, () => {
      ota.readInfo((_, info) => {
        if (info !== null) {
          t.equal(info.checksum, 'cbdakbcabcka')
          t.equal(info.version, '111111')
          t.equal(info.imageUrl, '/test/test')
          t.pass('info should not be null')
          t.end()
        } else {
          t.fail('there is a error,info should not be null')
          t.end()
        }
      })
    })
  })
})

test('Info re write should be ok', t => {
  t.plan(4)
  ota.writeInfo(info, () => {
    ota.writeInfo(info, () => {
      ota.readInfo((_, info) => {
        if (info !== null) {
          t.equal(info.checksum, 'cbdakbcabcka')
          t.equal(info.version, '111111')
          t.equal(info.imageUrl, '/test/test')
          t.pass('info should not be null')
          t.end()
        } else {
          t.fail('there is a error,info should not be null')
          t.end()
        }
      })
    })
  })
})
