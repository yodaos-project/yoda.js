var ttsMethod = require('./ttsMethod')

ttsMethod('speak', ['@cloud', 'hello! tts server'])
  .then((res) => {
    if (res && res[0] !== '-1') {
      console.log('tts speak success, speak id: ' + res[0])
    } else {
      console.log('tts speak error')
    }
  })
  .catch((err) => {
    console.log('error: ', err)
  })
