'use strict'

var lightMethod = require('./lightMethod')

var count = 0
function repeat (params) {
  count++
  return Promise.all([
    lightMethod.play('@play-loadtest', '/opt/light/setSpeaking.js', {}, { shouldResume: true }),
    lightMethod.play('@play-loadtest', '/opt/light/setMuted.js', { muted: true }, { shouldResume: true }),
    lightMethod.stop('@play-loadtest', '/opt/light/setMuted.js', { muted: false }, {}),
    lightMethod.play('@play-loadtest', '/opt/light/setVolume.js', { volume: 50, action: 'increase' }, {}),
    lightMethod.stop('@play-loadtest', '/opt/light/setSpeaking.js', {}, {})
  ]).then((res) => {
    console.log(count, 'success', res)
    setTimeout(() => {
      repeat()
    }, 800)
  }).catch((err) => {
    console.log(count, 'error', err)
  })
}

repeat()
