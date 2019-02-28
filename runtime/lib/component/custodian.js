var logger = require('logger')('custodian')
var property = require('@yoda/property')
var network = require('@yoda/network')
var bluetooth = require('@yoda/bluetooth')

var RuntimeState = {
  UNCONFIGURED: 0,
  CONFIGURING_NETWORK: 1,
  CONNECTING_NETWORK: 2,
  LOGGING_IN: 3,
  LOGGED_IN: 4
}

module.exports = Custodian

function Custodian (runtime) {
  this.runtime = runtime
  this.component = runtime.component
  this.masterId = null

  this.runtimeState = RuntimeState.UNCONFIGURED
  this.preRuntimeState = null
  this.networkDisconnOccur = null
  this.networkDisconnInterval = 10 * 1000
  this.curSsid = null
  this.curPasswd = null

  this.networkAgent = null
  this.initNetwork()

  this.bluetoothStream = null
  this.bleOpened = false
  this.bleTimer = null
  this.bleMaxAlive = 120 * 1000
  this.bleAlive = 60 * 1000
  this.initBluetooth()
}

Custodian.prototype.prepareNetwork = function () {
  this.networkAgent.getConfigNumOfWifi().then((reply) => {
    if (reply.wifi_config === 0) {
      this.configureNetwork()
      logger.info('Wifi hasnt initialized, start configuration...')
    } else {
      logger.info('Wifi has initialized, skip configuration')
    }
  })
}

Custodian.prototype.configureNetwork = function () {
  logger.debug(`configureNetwork, runtimeState: ${this.runtimeState}`)

  if (this.runtimeState !== RuntimeState.CONFIGURING_NETWORK) {
    this.preRuntimeState = this.runtimeState
    this.runtimeState = RuntimeState.CONFIGURING_NETWORK
  }
  this.networkAgent.disableWifi()
  this.networkAgent.startScanWifi()
  this.openBluetooth()
  this.bleTimer = setTimeout(() => {
    this.networkConfigurationTimeout(true)
  }, this.bleMaxAlive)
}

Custodian.prototype.networkConfigurationTimeout = function (isMute) {
  if (!isMute) {
    this.component.light.appSound(
      '@yoda', 'system://wifi/connect_timeout.ogg')
  }
  this.bluetoothStream.write(
    {topic: 'bind', sCode: '-12', sMsg: 'wifi连接超时'})
  if (this.curSsid && this.curPasswd) {
    this.networkAgent.removeWifi(this.curSsid, this.curPasswd)
    this.curSsid = null
    this.curPasswd = null
  }
  this.networkConfigurationFinished()
  /* Recover runtimeState */
  this.runtimeState = this.preRuntimeState
}

Custodian.prototype.networkConfigurationFinished = function () {
  this.networkAgent.stopScanWifi()
  this.networkAgent.enableWifi()
  this.closeBluetooth()
  clearTimeout(this.bleTimer)
  this.bleTimer = null
}

Custodian.prototype.resetState = function () {
  this.runtimeState = RuntimeState.UNCONFIGURED
}

Custodian.prototype.isUnconfigured = function () {
  return this.runtimeState === RuntimeState.UNCONFIGURED
}

Custodian.prototype.isConfiguringNetwork = function () {
  return this.runtimeState === RuntimeState.CONFIGURING_NETWORK
}

Custodian.prototype.isConnecting = function () {
  return this.runtimeState === RuntimeState.CONNECTING_NETWORK
}

Custodian.prototype.isLoggingIn = function () {
  return this.runtimeState === RuntimeState.LOGGING_IN
}

Custodian.prototype.isLoggedIn = function () {
  return this.runtimeState === RuntimeState.LOGGED_IN
}

Custodian.prototype.onLoginStatus = function (code, msg) {
  if (code === '201') {
    setTimeout(() => {
      this.bluetoothStream.write({topic: 'bind', sCode: code, sMsg: msg})
    }, 2000)
  } else {
    this.bluetoothStream.write({topic: 'bind', sCode: code, sMsg: msg})
  }
  logger.debug(`cloud event code=${code} msg=${msg}`)

  /**
   * 100: logging in ...
   * 101: login success
   * 201: bind master success
   * -101: login failed
   * -201: bind master failed
   */

  var loginFailed = () => {
    property.set('persist.netmanager.wifi', 0)
    this.runtimeState = RuntimeState.UNCONFIGURED
    this.networkAgent.removeWifi(this.curSsid, this.curPasswd)
    this.curSsid = null
    this.curPasswd = null
    this.networkConfigurationFinished()
  }

  if (code === '201') {
    property.set('state.network.connected', 'true')
    property.set('persist.netmanager.wifi', 1)
    property.set('persist.netmanager.wifi_ap', 0)
    this.runtime.dispatchNotification('on-network-connected', [])
    this.runtimeState = RuntimeState.LOGGED_IN
    this.networkConfigurationFinished()
  } else if (code === '-101') {
    this.component.light.appSound('@yoda', 'system://wifi/login_failed.ogg')
    loginFailed()
  } else if (code === '-201') {
    this.component.light.appSound(
      '@yoda', 'system://wifi/bind_master_failed.ogg')
    loginFailed()
  }
}

Custodian.prototype.deinit = function () {
  if (this.networkAgent) {
    this.networkAgent.deinit()
    this.networkAgent = null
  }

  if (this.bluetoothStream) {
    this.bluetoothStream.disconnect()
    this.bluetoothStream = null
  }

  if (this.bleTimer) {
    clearTimeout(this.bleTimer)
    this.bleTimer = null
  }
}

Custodian.prototype.initNetwork = function () {
  this.networkAgent = new network.NetworkAgent(true)

  this.networkAgent.on('network.status', (status) => {
    logger.debug(`network.status, runtimeState: ${this.runtimeState}, status: ${status.state}`)

    if (status.state === network.CONNECTED) {
      /**
        * Start login when received event that network has connected
        */
      if (this.networkDisconnOccur) {
        this.networkDisconnOccur = null
      }

      if (this.isConnecting()) {
        this.bluetoothStream.write(
          {topic: 'bind', sCode: '11', sMsg: 'wifi连接成功'})
      }

      if (this.isConnecting() || this.isUnconfigured()) {
        if (this.masterId) {
          this.runtime.login({ masterId: this.masterId })
        } else {
          this.runtime.login()
        }
        this.runtimeState = RuntimeState.LOGGING_IN
        logger.info(`connecting masterId=${this.masterId} is set`)
      }
    } else if (status.state === network.DISCONNECTED && this.isLoggedIn()) {
      /**
        * Reset runtimeState when received event that network is
        * disconnected continuously in ten seconds
        */
      if (this.networkDisconnOccur === null) {
        this.networkDisconnOccur = Date.now()
      } else if (Date.now() - this.networkDisconnOccur > this.networkDisconnInterval) {
        this.networkDisconnInterval = null
        property.set('state.network.connected', 'false')
        this.runtimeState = RuntimeState.UNCONFIGURED
        this.component.light.appSound(
          '@yoda', 'system://network_lag_media_stage_2.ogg')
      }
    }
  })
}

Custodian.prototype.initBluetooth = function () {
  this.bluetoothStream = bluetooth.getMessageStream()

  this.bluetoothStream.on('handshaked', () => {
    this.component.light.appSound('@yoda', 'system://ble_connected.ogg')
    logger.debug('ble device connected')
  })

  this.bluetoothStream.on('disconnected', () => {
    logger.debug('ble device disconnected')
  })

  this.bluetoothStream.on('data', (message) => {
    logger.debug(message)

    if (message.topic === 'getCapacities') {
      this.networkAgent.getCapacities().then((reply) => {
        this.bluetoothStream.write({topic: 'getCapacities', data: reply})
      })
    } else if (message.topic === 'getWifiList') {
      this.networkAgent.getListOfWifi().then((reply) => {
        var wifiList = reply.wifilist.map((item) => {
          return {S: item.SSID, L: item.SIGNAL}
        })

        this.bluetoothStream.write({topic: 'getWifiList', data: wifiList})
      })
    } else if (message.topic === 'bind') {
      this.masterId = message.data.U
      this.runtimeState = RuntimeState.CONNECTING_NETWORK
      this.curSsid = message.data.S
      this.curPasswd = message.data.P
      this.networkAgent.connectWifi(this.curSsid, this.curPasswd)
      this.component.light.appSound('@yoda', 'system://prepare_connect_wifi.ogg')
      this.bluetoothStream.write({topic: 'bind', sCode: '10', sMsg: 'wifi连接中'})
      clearTimeout(this.bleTimer)
      this.bleTimer = setTimeout(() => {
        this.networkConfigurationTimeout(false)
      }, this.bleAlive)
    }
  })
}

Custodian.prototype.openBluetooth = function () {
  var uuid = (property.get('ro.boot.serialno') || '').substr(-6)
  var productName = property.get('ro.rokid.build.productname') || 'Rokid-Me'
  var BLE_NAME = [ productName, uuid ].join('-')

  this.bluetoothStream.start(BLE_NAME, (err) => {
    if (err) {
      logger.info('open ble failed, name', BLE_NAME)
      logger.error(err && err.stack)
      return
    }

    this.bleOpened = true
    this.component.light.appSound('@yoda', 'system://wifi/setup_network.ogg')
    this.component.light.play(
      '@yoda', 'system://setStandby.js', {}, { shouldResume: true })
    logger.info('open ble success, name', BLE_NAME)
  })
}

Custodian.prototype.closeBluetooth = function () {
  this.bleOpened = false
  this.component.light.stop('@yoda', 'system://setStandby.js')
  setTimeout(() => this.bluetoothStream.end(), 2000)
}

Custodian.prototype.turenDidWakeUp = function () {
  logger.debug(`turenDisWakeUp, runtimeState: ${this.runtimeState}`)

  if (this.isLoggedIn()) {
    return
  }
  this.component.turen.pickup(false)

  if (this.isUnconfigured() || this.isConfiguringNetwork()) {
    /* awaken is not set for no network available, recover media directly */
    return this.component.light.ttsSound(
      '@yoda', 'system://guide_config_network.ogg'
    ).then(() => this.component.turen.recoverPausedOnAwaken())
  } else if (this.isConnecting() || this.isLoggingIn()) {
    /* awaken is not set for no network available, recover media directly */
    return this.component.light.ttsSound(
      '@yoda', 'system://wifi_is_connecting.ogg'
    ).then(() => this.component.turen.recoverPausedOnAwaken())
  }
}
