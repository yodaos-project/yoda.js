var dbus = require('dbus').getBus('session')
var _ = require('@yoda/util')._
var compose = require('@yoda/util').compose

var type = process.argv[2]
var verbose = process.argv[3]
var arg = process.argv[4]

var map = {
  asr: 'mockAsr',
  key: 'mockKeyboard'
}

main()

function main () {
  var method = map[type]
  if (method == null) {
    console.error('Unknown mock:', type)
    return process.exit(1)
  }

  console.log(`Mocking ${type}:`, arg)
  compose([
    cb => {
      dbus.getInterface(
        'com.rokid.AmsExport',
        '/rokid/yoda/debug',
        'rokid.yoda.Debug',
        cb
      )
    },
    (cb, iface) => {
      if (iface == null) {
        console.error('Error: VuiDaemon is not ready, try again later.')
        return process.exit(1)
      }
      if (typeof iface[method] !== 'function') {
        console.error(`Error: '${method}' is not implemented in YodaRT, try install a newer version of YodaRT and try again.`)
        return process.exit(1)
      }
      var callback = _.once(cb)
      iface[method](arg, callback)
      setTimeout(() => callback(new Error('Timed out on invoke YodaRT control method.')), 10 * 1000)
    }
  ], function onDone (err, result) {
    if (err) {
      console.error('Unexpected error on mock:', err && err.message)
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
    if (verbose !== 'YES') {
      return process.exit(data.ok === true ? 0 : 1)
    }
    if (data.ok !== true) {
      console.log('Error:', data.message)
      console.log('Stack:', data.stack)
      return process.exit(1)
    }
    console.log('Result:', JSON.stringify(data.result, null, 2))

    process.exit(0)
  })
}
