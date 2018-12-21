var dbus = require('dbus').getBus('session')
var compose = require('@yoda/util').compose

var methodName = process.argv[2]
var args = process.argv.slice(3)

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

    if (methodName === '--help') {
      var methods = Object.keys(iface).filter(it => {
        return typeof iface[it] === 'function'
      })
      return compose.Break(JSON.stringify({
        ok: true,
        result: methods
      }))
    }

    if (typeof iface[methodName] !== 'function') {
      console.error(`Error: ${methodName} is not implemented in YodaRT, try install a newer version of YodaRT and try again.`)
      return process.exit(1)
    }
    console.log('-> calling debug interface:', methodName)
    iface[methodName].apply(iface, args.concat(cb))
  }
], function onDone (err, result) {
  if (err) {
    console.error('Unexpected error on calling interface:', err && err.message)
    console.error(err && err.stack)
    return process.exit(1)
  }
  var data
  try {
    data = JSON.parse(result)
  } catch (err) {
    console.error('Failed to parse result from VuiDaemon:', result)
  }
  if (data.ok !== true) {
    console.log('Not ok:')
    console.log('Error:', data.message)
    console.log('Stack:', data.stack)
    return process.exit(1)
  }
  console.log(data.result)

  process.exit(0)
})
