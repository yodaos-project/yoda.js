var test = require('tape')
var wifi = require('@yoda/wifi')

var helper = require('../../helper')
var mock = require('../../helper/mock')
var Custodian = require(`${helper.paths.runtime}/lib/component/custodian`)

mock.mockReturns(wifi, 'enableScanPassively', undefined)
mock.mockReturns(wifi, 'resetWifi', undefined)
mock.mockReturns(wifi, 'disableAll', undefined)
mock.mockReturns(wifi, 'checkNetwork', undefined)

test('custodian state shall shifts', t => {
  t.plan(14)
  var runtime = {
    reconnect: function () {
      t.pass('onNetworkConnect shall trigger runtime#reconnect')
    },
    startApp: function () {
      t.fail('runtime#startApp shall not be called since logged in')
    },
    component: {
      appScheduler: {
        appMap: {}
      },
      lifetime: {
        getCurrentAppId: () => undefined
      },
      light: {
        stop: function () {}
      },
      wormhole: {
        setOffline: function () {
          t.pass('onNetworkDisconnect shall trigger runtime.wormhole#setOffline')
        }
      }
    }
  }
  var custodian = new Custodian(runtime)
  t.false(custodian.isRegistering())
  t.false(custodian.isPrepared())
  t.true(custodian.isNetworkUnavailable())

  custodian.onNetworkConnect()
  t.true(custodian.isRegistering(), 'custodian shall be network connected')
  t.false(custodian.isPrepared())
  t.false(custodian.isNetworkUnavailable())

  custodian.onLoggedIn()
  t.false(custodian.isRegistering())
  t.true(custodian.isPrepared(), 'custodian shall be logged in')
  t.true(custodian.isLoggedIn(), 'custodian shall be logged in')
  t.false(custodian.isNetworkUnavailable())

  custodian.onNetworkDisconnect()
  t.false(custodian.isRegistering())
  t.false(custodian.isPrepared())
  t.true(custodian.isLoggedIn(), 'custodian shall be still logged in')
  t.true(custodian.isNetworkUnavailable(), 'custodian shall be network unavailable on network disconnected')
})

test('custodian shall start network app on network disconnect if not logged in', t => {
  t.plan(4)
  mock.mockReturns(wifi, 'getNumOfHistory', 0)

  var runtime = {
    resetNetwork: function () {
      t.pass('onNetworkDisconnect shall trigger runtime#resetNetwork')
    },
    component: {
      appScheduler: {
        appMap: {}
      },
      lifetime: {
        getCurrentAppId: () => undefined
      },
      light: {
        stop: function () {}
      },
      wormhole: {
        setOffline: function () {
          t.fail('onNetworkDisconnect shall not trigger runtime.wormhole#setOffline')
        }
      }
    }
  }
  var custodian = new Custodian(runtime)
  custodian.onNetworkDisconnect()
  t.false(custodian.isRegistering())
  t.false(custodian.isPrepared())
  t.true(custodian.isNetworkUnavailable())
})

test('custodian shall reset network', t => {
  t.plan(11)
  var runtime = {
    reconnect: function () {
      t.fail('onNetworkConnect shall not trigger runtime#reconnect')
    },
    openUrl: function () {
      t.pass('resetNetwork shall trigger runtime#startApp')
    },
    onGetPropAll: function () {
      return { foobar: 10 }
    },
    component: {
      appScheduler: {
        appMap: {}
      },
      lifetime: {
        getCurrentAppId: () => undefined
      },
      light: {
        stop: function () {}
      },
      wormhole: {
        setOffline: function () {
          t.pass('resetNetwork shall trigger runtime.wormhole#setOffline')
        }
      }
    }
  }
  var custodian = new Custodian(runtime)
  custodian.onNetworkConnect()
  custodian.onLoggedIn()
  t.false(custodian.isRegistering())
  t.true(custodian.isPrepared(), 'custodian shall be prepared')
  t.false(custodian.isNetworkUnavailable())

  custodian.resetNetwork()
  t.true(custodian.isNetworkUnavailable(), 'custodian shall be treated as network unavailable if reset network')
  t.true(custodian.isLoggedIn(), 'custodian shall be logged in only if reset network')
  t.equal(runtime.onGetPropAll().foobar, 10, 'custodian shall be able to get prop')

  custodian.onLogout()
  t.false(custodian.isRegistering())
  t.false(custodian.isPrepared())
  t.deepEqual(runtime.onGetPropAll(), {}, 'custodian shall be getting the empty prop')
})
