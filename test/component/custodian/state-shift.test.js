var test = require('tape')
var helper = require('../../helper')
var Custodian = require(`${helper.paths.runtime}/lib/component/custodian`)
var NetworkMock = require('../../@yoda/network/mock.js')

test('custodian state shall shifts', t => {
  var runtime = {
    reconnect: function () {
      t.pass('onNetworkConnect shall trigger runtime#reconnect')
    },
    startApp: function () {
      t.fail('runtime#startApp shall not be called since logged in')
    },
    login: function () {},
    dispatchNotification: function () {},
    component: {
      appScheduler: {
        appMap: {}
      },
      lifetime: {
        getCurrentAppId: () => undefined
      },
      light: {
        stop: function () {},
        appSound: function () {}
      },
      wormhole: {
        setOffline: function () {
          t.pass('onNetworkDisconnect shall trigger runtime.wormhole#setOffline')
        }
      }
    }
  }
  var custodian = new Custodian(runtime)
  custodian.networkAgent.deinit()

  /* Replace flora with NetworkMock */
  custodian.networkAgent._flora = new NetworkMock()

  /* Mock bluetooth */
  custodian.initBluetooth()
  custodian.bluetoothStream.disconnect()
  custodian.openBluetooth = () => {}
  custodian.closeBluetooth = () => {}

  /* test start */
  t.true(custodian.isUnconfigured())
  custodian.configureNetwork()
  t.true(custodian.isConfiguringNetwork())

  custodian.bluetoothStream.emit('data', {
    topic: 'bind',
    data: {
      U: 'test_ssid',
      P: 'passwd'
    }
  })
  t.true(custodian.isConnecting())
  custodian.networkAgent._flora.subscribe(
    'network.status',
    custodian.networkAgent._handleNetworkStatus.bind(custodian.networkAgent))

  setTimeout(() => {
    t.true(custodian.isLoggingIn())

    custodian.onLoginStatus('-101', 'login failed')
    t.false(custodian.isLoggedIn())
    t.true(custodian.isUnconfigured())

    /* test end */
    custodian.deinit()
    t.end()
  }, 1000)
})
