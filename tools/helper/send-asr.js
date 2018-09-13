var dbus = require('dbus').getBus('session')
var compose = require('@yoda/util').compose

var asr = process.argv[2]
var verbose = process.argv[3]

console.log('Mocking asr:', asr)
compose([
  cb => {
    dbus.getInterface(
      'com.rokid.AmsExport',
      '/activation/extapp',
      'com.rokid.activation.extapp',
      cb
    )
  },
  (cb, iface) => {
    if (iface == null) {
      console.error('Error: VuiDaemon is not ready, try again later.')
      return process.exit(1)
    }
    if (typeof iface.mockAsr !== 'function') {
      console.error('Error: MockASR is not implemented in YodaRT, try install a newer version of YodaRT and try again.')
      return process.exit(1)
    }
    iface.mockAsr(asr, cb)
  }
], function onDone (err, result) {
  if (err) {
    console.error('Unexpected error on mock asr:', err && err.message)
    console.error(err && err.stack)
    return process.exit(1)
  }
  var data
  try {
    data = JSON.parse(result)
  } catch (err) {
    console.error('Failed to parse result from VuiDaemon:', result)
  }
  console.log('Ok:', data.ok === true)
  if (!verbose) {
    return process.exit(data.ok === true ? 0 : 1)
  }
  if (data.ok !== true) {
    console.log('Error:', data.message)
    console.log('Stack:', data.stack)
    return process.exit(1)
  }
  console.log('NLP:', data.nlp)
  console.log('Action:', data.action)

  process.exit(0)
})
