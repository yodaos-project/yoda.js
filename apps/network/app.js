'use strict'

var logger = require('logger')('@network')
var bluetooth = require('@yoda/bluetooth')
var wifi = require('@yoda/wifi')
var property = require('@yoda/property')
var messageStream = bluetooth.getMessageStream()

module.exports = function (app) {
  var started = false
  var sleeping = false
  var uuid = property.get('ro.boot.serialno') || ''
  // connecting to wifi or not
  var connecting = false
  // save the current connected wifi config
  var prevWIFI = {
    ssid: '',
    psk: ''
  }
  var connectTimeout, pooling
  var BLE_NAME = [
    'Rokid',
    property.get('ro.rokid.build.productname') || 'Me',
    uuid.substr(-6)
  ].join('-')
  logger.log(BLE_NAME)

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

  var DEFAULT_SLEEP_TIME = 5 * 60 * 1000
  var SLEEP_TIME = +property.get('app.network.sleeptime') || DEFAULT_SLEEP_TIME
  var bleEnable = false
  var sleepTimer

  var scanHandle = null
  var WifiList = []

  wifi.scan()

  app.on('request', function (nlp, action) {
    if (started && nlp.intent === 'wifi_status') {
      // ignore wifi status if not connecting
      if (connecting === false) {
        return
      }
      var status = WIFI_STATUS[action.response.action.status]
      if (status !== undefined) {
        logger.log(status)
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
      logger.log('app report: ' + action.response.action.status)
      return
    }
    if (started && nlp.intent === 'cloud_status') {
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
    if (sleeping && nlp.intent === 'user_says') {
      // do  nothing
      logger.log('sleeping mode now, ignore voice')
      return
    }
    // user say again
    if (started && nlp.intent === 'user_says') {
      this.playSound('system://wifi/setup_network.ogg')
      // retimer
      timerAndSleep()
      return
    }
    if (started && nlp.intent === 'into_sleep') {
      intoSleep()
      return
    }
    // user voice active after into sleep
    if (!started && nlp.intent === 'user_says') {
      app.light.play('system://setStandby.js')
      messageStream.start(BLE_NAME)
      // retimer
      timerAndSleep()
      started = true
      logger.log('user voice active')
      return
    }
    // nothing to do
    if (started === true) {
      return
    }
    started = true
    sleeping = false
    messageStream = bluetooth.getMessageStream()
    messageStream.start(BLE_NAME, true, (err) => {
      logger.error(err && err.stack)
      // FIXME(Yorkie): needs tell bind is unavailable?
    })
    logger.log('open ble success')
    bleEnable = true
    app.light.play('system://setStandby.js')
    // start timer
    timerAndSleep()

    messageStream.on('handshaked', (message) => {
      app.playSound('system://wifi/ble_connected.ogg')
      // retimer
      timerAndSleep()
    })

    messageStream.on('data', function (message) {
      logger.log('message: ' + message)
      // retimer
      timerAndSleep()

      if (message && message.topic && message.topic === 'getWifiList') {
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
      if (message && message.topic && message.topic === 'bind') {
        connectWIFI(message.data, (err, connect) => {
          connecting = false
          if (err || !connect) {
            sendWifiStatus({
              topic: 'bind',
              sCode: '-12',
              sMsg: 'wifi连接超时'
            })
            stopConnectWIFI()
            app.playSound('system://wifi/connect_timeout.ogg')
          } else {
            logger.log('connect wifi success')
            sendWifiStatus({
              topic: 'bind',
              sCode: '11',
              sMsg: 'wifi连接成功'
            })
            wifi.enableScanPassively()
            wifi.save()
          }
        })
      }
    })
  })

  app.on('destroyed', function () {
    // close ble if it is open
    if (bleEnable) {
      bluetooth.disconnect()
      logger.log('ble closed')
    }
    clearTimeout(sleepTimer)
    logger.log('destroyed')
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
    wifi.disableAll()
    clearTimeout(pooling)
    clearTimeout(connectTimeout)
    connecting = false
  }

  function getWIFIState (cb) {
    var state = wifi.getWifiState()
    logger.log(`wifi state is ${state}`)
    // always poll until get WIFI_CONNECTED state or timeout
    // not used now, TODO:
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

  // update wifi list, wifi list will upate in services now
  // eslint-disable-next-line no-unused-vars
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

  // stop update wifi list
  // eslint-disable-next-line no-unused-vars
  function stopScan () {
    clearInterval(scanHandle)
  }

  function sendWifiList (list) {
    logger.log('send WIFI List to App: ', JSON.stringify(list))
    messageStream.write({
      topic: 'getWifiList',
      data: list || []
    })
  }

  function sendWifiStatus (data) {
    messageStream.write(data)
  }

  function timerAndSleep () {
    clearTimeout(sleepTimer)
    sleepTimer = setTimeout(function sleep () {
      intoSleep()
    }, SLEEP_TIME)
  }

  function intoSleep () {
    logger.log('start sleep ......')
    clearTimeout(sleepTimer)
    app.light.stop()
    if (bleEnable) {
      messageStream.end()
      bleEnable = false
      logger.log('closed ble')
    }
    sleeping = true
    started = false
  }
}
