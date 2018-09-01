'use strict'

var wifi = require('@yoda/wifi')

module.exports = function (activity) {
  activity.on('request', function (nlp, action) {
    if (nlp.intent === 'disconnect_network') {
      wifi.disableAll()
      activity.exit()
    } else if (nlp.intent === 'sleep' ||
      nlp.intent === 'dormancy' ||
      nlp.intent === 'usersleep' ||
      nlp.intent === 'ROKID.SYSTEM.EXIT') {
      activity.destroyAll()
    } else {
      activity.tts.speak('什么设置')
        .then(() => activity.exit())
    }
  })
}
