'use strict'

module.exports = function (activity) {
  var STRING_NOBATTERY = '当前产品没有电池，使用期间请连接电源'

  function speakAndExit (text) {
    return activity.tts.speak(text).then(() => {
      activity.exit()
    })
  }

  activity.on('request', function (nlp, action) {
    speakAndExit(STRING_NOBATTERY)
  })
}
