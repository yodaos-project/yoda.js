'use strict'

var logger = require('logger')('@network')
var bluetooth = require('@yoda/bluetooth')
var wifi = require('@yoda/wifi')
var property = require('@yoda/property')
var _ = require('@yoda/util')._

var started = false
var messageStream = bluetooth.getMessageStream()
var NET_STATUS_IDLE = 0
var NET_STATUS_CONNECTING = 1
var BLE_STATUS_CLOSED = 0
var BLE_STATUS_OPENING = 1
var BLE_STATUS_OPEN = 2
var BLE_STATUS_CONNECTED = 3
var DEFAULT_SLEEP_TIME = 1 * 60 * 1000
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

module.exports = function (app) {
  var netStatus = NET_STATUS_IDLE
  var bleStatus = BLE_STATUS_CLOSED
  var uuid = (property.get('ro.boot.serialno') || '').substr(-6)
  // save the current connected wifi config
  var prevWIFI = {
    ssid: '',
    psk: ''
  }
  var connectTimeout, pooling, connectId
  var productName = property.get('ro.rokid.build.productname') || 'Rokid-Me'
  var BLE_NAME = [ productName, uuid ].join('-')
  logger.log(BLE_NAME)

  var SLEEP_TIME = +property.get('app.network.sleeptime') || DEFAULT_SLEEP_TIME
  var sleepTimer
  var scanHandle = null
  var WifiList = []

  // scan wifi list when app startup
  // phone app need get scan results of device, show list in phone app
  wifi.scan()

  app.on('destroy', function () {
    intoSleep()
    bluetooth.disconnect()
    logger.log('network app destroy')
  })

  app.on('url', url => {
    var code, msg
    logger.log('app recv url:', url.href)

    switch (url.pathname) {
      case '/cloud_status':
        code = _.get(url.query, 'code')
        msg = _.get(url.query, 'msg')
        if (!code || !msg) {
          logger.log('cloud_status: invalid params, code', code, ', msg', msg)
          break
        }
        sendWifiStatus({
          topic: 'bind',
          sCode: code,
          sMsg: msg
        })
        var cloudStatus = CLOUD_STATUS[code]
        if (cloudStatus) {
          app.playSound(cloudStatus)
          if (connectId >= 0) {
            wifi.removeNetwork(connectId)
            connectId = undefined
          }
        } else if (code === '201') {
          // bind success, exit app
          // after 1 second, because need some time for sendWifiStatus
          setTimeout(intoSleep, 1000)
        }
        break
      case '/setup':
        setupNetworkByBle()
        break
      case '/wifi_status':
        if (netStatus === NET_STATUS_CONNECTING) {
          var status = _.get(url.query, 'status')
          var networkInfo = _.get(url.query, 'value')
          if (!status) {
            logger.log('wifi_status: invalid params, status not exists')
            break
          }
          logger.log('wifi_status: status', status, ', networkInfo', networkInfo)
          var wifiStatus = WIFI_STATUS[status]
          if (wifiStatus !== undefined) {
            if (status === 'CTRL-EVENT-SSID-TEMP-DISABLED') {
              if (!networkInfo) {
                logger.log('wifi_status: invalid params, value not exists')
                break
              }
              var search = networkInfo.match(/ssid=".+"/)
              if (search && `ssid="${prevWIFI.ssid}" psk="${prevWIFI.psk}"` === search[0]) {
                stopConnectWIFI()
                app.playSound('system://wifi/auth_failed.ogg')
                sendWifiStatus(wifiStatus)
              }
              netStatus = NET_STATUS_IDLE
            } else {
              stopConnectWIFI()
              app.playSound('system://wifi/network_not_found.ogg')
              sendWifiStatus(wifiStatus)
              netStatus = NET_STATUS_IDLE
            }
          }
        }
        break
      case '/renew':
        if (bleStatus === BLE_STATUS_CONNECTED) {
          logger.log('renew sleep timer')
          // renew sleep timer
          timerAndSleep()
        } else {
          setupNetworkByBle()
        }
        break
    }
  })

  function initBleMessageStream (stream) {
    if (started === true) {
      return
    }
    started = true
    stream.on('handshaked', () => {
      logger.log('ble device connected')
      bleStatus = BLE_STATUS_CONNECTED
      app.playSound('system://ble_connected.ogg')
      timerAndSleep()
    })

    stream.on('disconnected', () => {
      logger.log('ble device disconnected')
      if (bleStatus === BLE_STATUS_CONNECTED) {
        bleStatus = BLE_STATUS_OPEN
      }
    })

    stream.on('data', function (message) {
      logger.log('message:', message)
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
          netStatus = NET_STATUS_IDLE
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
            wifi.save()
          }
        })
      }
    })
  }

  function setupNetworkByBle () {
    wifi.disableAll()
    logger.log('open ble with name', BLE_NAME)
    initBleMessageStream(messageStream)
    if (bleStatus !== BLE_STATUS_OPENING) {
      bleStatus = BLE_STATUS_OPENING
      messageStream.start(BLE_NAME, true, (err) => {
        if (err) {
          logger.error(err && err.stack)
          logger.log('open ble failed, name', BLE_NAME)
          bleStatus = BLE_STATUS_CLOSED
        } else {
          logger.log('open ble success, name', BLE_NAME)
          bleStatus = BLE_STATUS_OPEN
        }
        // FIXME(Yorkie): needs tell bind is unavailable?
      })
      app.light.play('system://setStandby.js', {}, { shouldResume: true })
    }
    timerAndSleep()
  }

  function connectWIFI (config, cb) {
    var data = config

    try {
      connectId = wifi.joinNetwork(data.S, data.P, '')
    } catch (err) {
      connectId = undefined
    }
    logger.log(`wifi current id is ${connectId}`)

    if (connectId >= 0) {
      netStatus = NET_STATUS_CONNECTING
      prevWIFI.ssid = data.S
      prevWIFI.psk = data.P
      sendWifiStatus({
        topic: 'bind',
        sCode: '10',
        sMsg: 'wifi连接中'
      })
      logger.log(`start connect to wifi with SSID: ${data.S}`)
      property.set('app.network.masterId', data.U)
      app.playSound('system://prepare_connect_wifi.ogg')
      connectTimeout = setTimeout(() => {
        logger.log('connect to wifi timeout')
        clearTimeout(pooling)
        cb(new Error('timeout'), false)
      }, 20000)
      getWIFIState(cb)
    } else {
      cb(new Error('invalid ssid/password: ' + data.S + '/' + data.P), false)
    }
  }

  function stopConnectWIFI () {
    logger.log(`wifi remove current id is ${connectId}`)
    wifi.removeNetwork(connectId)
    clearTimeout(pooling)
    clearTimeout(connectTimeout)
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
    logger.log('setup timer for intoSleep')
    sleepTimer = setTimeout(function sleep () {
      logger.log('timer trigger intoSleep')
      intoSleep()
    }, SLEEP_TIME)
  }

  function intoSleep () {
    logger.log('start sleep ......')
    clearTimeout(sleepTimer)
    app.light.stop('system://setStandby.js')
    if (bleStatus !== BLE_STATUS_CLOSED) {
      messageStream.end()
      logger.log('closed ble')
    }
    app.exit()
    wifi.enableScanPassively()
  }
}
