var test = require('tape')
var ota = require('@yoda/ota')
var wifi = require('@yoda/wifi')

var helper = require('../../helper')
var mock = require('../../helper/mock')
var Custodian = require(`${helper.paths.runtime}/lib/component/custodian`)

mock.mockReturns(ota, 'getInfoIfFirstUpgradedBoot', undefined)
mock.mockReturns(wifi, 'resetWifi', undefined)
mock.mockReturns(wifi, 'disableAll', undefined)
mock.mockReturns(wifi, 'checkNetwork', undefined)

test('custodian state shall shifts', t => {
  t.plan(18)
  var runtime = {
    reconnect: function () {
      t.pass('onNetworkConnect shall trigger runtime#reconnect')
    },
    startApp: function () {
      t.fail('runtime#startApp shall not be called since logged in')
    },
    wormhole: {
      setOffline: function () {
        t.pass('onNetworkDisconnect shall trigger runtime.wormhole#setOffline')
      }
    }
  }
  var custodian = new Custodian(runtime)
  t.true(custodian.isConfiguringNetwork(), 'custodian shall be configuring network at initiation')
  t.false(custodian.isRegistering())
  t.false(custodian.isPrepared())
  t.false(custodian.isNetworkUnavailable())

  custodian.onNetworkConnect()
  t.false(custodian.isConfiguringNetwork())
  t.true(custodian.isRegistering(), 'custodian shall be network connected')
  t.false(custodian.isPrepared())
  t.false(custodian.isNetworkUnavailable())

  custodian.onLoggedIn()
  t.false(custodian.isConfiguringNetwork())
  t.false(custodian.isRegistering())
  t.true(custodian.isPrepared(), 'custodian shall be logged in')
  t.true(custodian.isLoggedIn(), 'custodian shall be logged in')
  t.false(custodian.isNetworkUnavailable())

  custodian.onNetworkDisconnect()
  t.false(custodian.isConfiguringNetwork())
  t.false(custodian.isRegistering())
  t.false(custodian.isPrepared())
  t.true(custodian.isLoggedIn(), 'custodian shall be still logged in')
  t.true(custodian.isNetworkUnavailable(), 'custodian shall be network unavailable on network disconnected')
})

test('custodian shall start network app on network disconnect if not logged in', t => {
  t.plan(5)
  mock.mockReturns(wifi, 'getNumOfHistory', 0)

  var runtime = {
    openUrl: function () {
      t.pass('onNetworkDisconnect shall trigger runtime#openUrl')
    },
    wormhole: {
      setOffline: function () {
        t.fail('onNetworkDisconnect shall not trigger runtime.wormhole#setOffline')
      }
    }
  }
  var custodian = new Custodian(runtime)
  custodian.onNetworkDisconnect()
  t.true(custodian.isConfiguringNetwork(), 'custodian shall be configuring network at initiation')
  t.false(custodian.isRegistering())
  t.false(custodian.isPrepared())
  t.false(custodian.isNetworkUnavailable())
})

test('custodian shall reset network', t => {
  t.plan(10)
  var runtime = {
    reconnect: function () {
      t.pass('onNetworkConnect shall trigger runtime#reconnect')
    },
    openUrl: function () {
      t.pass('resetNetwork shall trigger runtime#startApp')
    },
    wormhole: {
      setOffline: function () {
        t.pass('resetNetwork shall trigger runtime.wormhole#setOffline')
      }
    }
  }
  var custodian = new Custodian(runtime)
  custodian.onNetworkConnect()
  custodian.onLoggedIn()
  t.false(custodian.isConfiguringNetwork())
  t.false(custodian.isRegistering())
  t.true(custodian.isPrepared(), 'custodian shall be prepared')
  t.false(custodian.isNetworkUnavailable())

  custodian.resetNetwork()
  t.true(custodian.isConfiguringNetwork(), 'custodian shall be configuring network at reset network')
  t.false(custodian.isRegistering())
  t.false(custodian.isPrepared())
  t.false(custodian.isNetworkUnavailable())
})
