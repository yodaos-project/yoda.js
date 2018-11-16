'use strict'

var test = require('tape')
var helper = require('../helper')
var DbusProxy = require(`${helper.paths.runtime}/lib/dbus-remote-call`)

test('should test dbus-remote-call', t => {
  var opts = {
    dbusService: 'service',
    dbusObjectPath: 'object path',
    dbusInterface: 'interface'
  }
  var bus = {
    callMethod: function () {}
  }
  var proxy = new DbusProxy(bus, opts)
  t.equal(typeof proxy.invoke, 'function')
  t.equal(typeof proxy.listen, 'function')
  t.end()
})
