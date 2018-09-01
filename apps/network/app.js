'use strict'

var logger = require('logger')('@network')
var zeromq = require('zeromq')
var wifi = require('@yoda/wifi')
var property = require('@yoda/property')

module.exports = function (app) {
  var uuid = property.get('ro.boot.serialno') || ''
  var connecting = false
  var prevWIFI = {
    ssid: '',
    psk: ''
  }
  var connectTimeout, pooling

  var BLE_NAME = 'Rokid-Me-' + uuid.substr(-6)
  console.log(BLE_NAME)
  var BLEC_OPEN = { proto: 'ROKID_BLE', command: 'ON', name: BLE_NAME }
  var BLEC_CLOSE = { proto: 'ROKID_BLE', command: 'OFF' }

  var WIFI_STATUS = {
    'CTRL-EVENT-NETWORK-NOT-FOUND': {
      topic: 'bind',
      sCode: '-13',
      sMsg: '没找到当前wifi'
    },
    'CTRL-EVENT-SSID-TEMP-DISABLED': {
      topic: 'bind',
      sCode: '-11',
      sMsg: 'wifi密码错误'
    }
  }

  var CLOUD_STATUS = {
    '-101': 'system://wifi/login_failed.ogg',
    '-201': 'system://wifi/bind_master_failed.ogg'
  }

  var bleCtrl = zeromq.socket('pub')
  bleCtrl.bindSync('ipc:///var/run/bluetooth/command')
  setTimeout(() => {
    bleCtrl.send(JSON.stringify(BLEC_OPEN))
  }, 1000)

  var bleData = zeromq.socket('sub')
  bleData.connect('ipc:///var/run/bluetooth/rokid_ble_event')
  bleData.subscribe('')

  var scanHandle = null
  var WifiList = []

  wifi.scan()
  // startScan()

  app.on('onrequest', function (nlp, action) {
    // console.log('onrequest, nlp and action', nlp, action)
    if (this.started && nlp.intent === 'wifi_status') {
      // ignore wifi status if not connecting
      if (connecting === false) {
        return
      }
      var status = WIFI_STATUS[action.response.action.status]
      if (status !== undefined) {
        console.log('---------', status)
        if (action.response.action.status === 'CTRL-EVENT-SSID-TEMP-DISABLED') {
          var search = action.response.action.value.match(/ssid=".+"/)
          if (search && `ssid="${prevWIFI.ssid}" psk="${prevWIFI.psk}"` === search[0]) {
            stopConnectWIFI()
            app.playSound('system://wifi/auth_failed.ogg')
            sendWifiStatus(status)
          }
        } else {
          stopConnectWIFI()
          app.playSound('system://wifi/network_not_found.ogg')
          sendWifiStatus(status)
        }
      }
      console.log('app report: ' + action.response.action.status)
      return
    }
    if (this.started && nlp.intent === 'cloud_status') {
      sendWifiStatus({
        topic: 'bind',
        sCode: action.response.action.code,
        sMsg: action.response.action.msg
      })
      var cloudStatus = CLOUD_STATUS[action.response.action.code]
      if (cloudStatus) {
        app.playSound(cloudStatus)
      }

      return
    }
    if (this.started === true) {
      this.playSound('system://wifi/setup_network.ogg')
      return
    }
    this.started = true
    this.light.play('system://setStandby.js')

    bleData.on('message', function (message) {
      console.log('message: ' + message)
      message = JSON.parse(message)
      if (message.state && message.state === 'connected') {
        app.playSound('system://wifi/ble_connected.ogg')
      }
      if (message.data && message.data.topic && message.data.topic === 'getWifiList') {
        if (WifiList.length <= 0) {
          WifiList = wifi.getWifiList().map((item) => {
            return {
              S: item.ssid,
              L: item.signal
            }
          })
        }
        sendWifiList(WifiList)
      }
      if (message.data && message.data.topic && message.data.topic === 'bind') {
        connectWIFI(message.data.data, (err, connect) => {
          connecting = false
          if (err || !connect) {
            sendWifiStatus({
              topic: 'bind',
              sCode: '-12',
              sMsg: 'wifi连接超时'
            })
            app.playSound('system://wifi/connect_timeout.ogg')
          } else {
            logger.log('connect wifi success')
            sendWifiStatus({
              topic: 'bind',
              sCode: '11',
              sMsg: 'wifi连接成功'
            })
            wifi.save()
          }
        })
      }
    })
  })

  app.on('destroyed', function () {
    console.log('destroyed')
  })

  function connectWIFI (config, cb) {
    if (connecting) return
    connecting = true
    var data = config

    prevWIFI.ssid = data.S
    prevWIFI.psk = data.P

    sendWifiStatus({
      topic: 'bind',
      sCode: '10',
      sMsg: 'wifi连接中'
    })

    logger.log(`start connect to wifi with SSID: ${data.S}`)
    property.set('persist.system.user.userId', data.U)
    app.playSound('system://wifi/prepare_connect_wifi.ogg')
    getWIFIState(cb)
    connectTimeout = setTimeout(() => {
      logger.log('connect to wifi timeout')
      clearTimeout(pooling)
      cb(new Error('timeout'), false)
    }, 10000)
    wifi.joinNetwork(data.S, data.P, '')
  }

  function stopConnectWIFI () {
    clearTimeout(pooling)
    clearTimeout(connectTimeout)
    connecting = false
  }

  function getWIFIState (cb) {
    var state = wifi.getWifiState()
    logger.log(`wifi state is ${state}`)
    if (state === wifi.WIFI_INIVATE) {
      // TODO: how?
    } else if (state === wifi.WIFI_SCANING) {
      // TODO: how?
    } else if (state === wifi.WIFI_CONNECTED) {
      clearTimeout(connectTimeout)
      cb(null, true)
      return
    } else if (state === wifi.WIFI_UNCONNECTED) {

    }
    pooling = setTimeout(() => {
      getWIFIState(cb)
    }, 300)
  }

  function startScan () {
    clearInterval(scanHandle)
    scanHandle = setInterval(function () {
      var list = wifi.getWifiList()
      WifiList = list.map((item) => {
        return {
          S: item.ssid,
          L: item.signal
        }
      })
    }, 1000)
  }

  function stopScan () {
    clearInterval(scanHandle)
  }

  function sendWifiList (list) {
    bleCtrl.send(JSON.stringify({
      proto: 'ROKID_BLE',
      data: {
        topic: 'getWifiList',
        data: list || []
      }
    }))
  }

  function sendWifiStatus (data) {
    bleCtrl.send(JSON.stringify({
      proto: 'ROKID_BLE',
      data: data
    }))
  }
}
