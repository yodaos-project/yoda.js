'use strict'

module.exports = function (activity) {
  function random (max) {
    return Math.floor(Math.random() * max)
  }

  function speakAndExit (text) {
    return activity.tts.speak(text)
      .then(() => activity.exit())
  }

  function speakRandomlyExit (texts) {
    speakAndExit(texts[random(texts.length)])
  }

  var intentHandler = {
    'what_can_u_do': (texts) => {
      speakRandomlyExit(texts)
    },
    'what_is_special': (texts) => {
      speakRandomlyExit(texts)
    },
    'how_to_disconnect_net': (text) => {
      speakAndExit(text)
    },
    'how_to_update': (texts) => {
      speakRandomlyExit(texts)
    },
    'rokid_service': (texts, slots) => {
      for (var key in texts) {
        if (key in slots) {
          speakAndExit(texts[key])
          return
        }
      }
      activity.exit()
    },
    'rokid_light': (texts) => {
      speakRandomlyExit(texts)
    },
    'rokid_power': (texts) => {
      speakRandomlyExit(texts)
    }
  }

  activity.on('request', function (nlp, action) {
    var textTable = require('./texts.json')
    if (nlp.intent in intentHandler && nlp.intent in textTable) {
      var handler = intentHandler[nlp.intent]
      var texts = textTable[nlp.intent]
      handler(texts, nlp.slots)
    } else {
      activity.exit()
    }
  })
}
