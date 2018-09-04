'use strict'
var test = require('tape')
var AudioManager = require('@yoda/audio').AudioManager

var tags = [
  null,
  'STREAM_AUDIO',
  'STREAM_TTS',
  'STREAM_PLAYBACK',
  'STREAM_ALARM',
  'STREAM_SYSTEM'
]
var cases = [ 10, 33, 55, 88, 100 ]

tags.forEach(key => {
  var tag
  if (key != null) {
    tag = AudioManager[key]
  }

  cases.forEach(esac => {
    step(esac, '')
  })
  reverse(cases).forEach(esac => {
    step(esac, '')
  })

  function step (esac, suffix) {
    test.skip(`${key || 'default'}: set volume ${esac}${suffix}`, t => {
      t.plan(1)
      AudioManager.setVolume.apply(AudioManager, [tag, esac].filter(it => it != null))
      var ret = AudioManager.getVolume.apply(AudioManager, [tag].filter(it => it != null))
      t.strictEqual(ret, esac)
    })
  }
})

function reverse (arr) {
  var ret = []
  var len = arr.length
  for (var idx = len; idx > 0; --idx) {
    ret.push(arr[idx - 1])
  }
  return ret
}
