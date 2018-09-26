var logger = require('logger')('custodian')
var ota = require('@yoda/ota')
var wifi = require('@yoda/wifi')

module.exports = Custodian
function Custodian (runtime) {
  this.runtime = runtime

  /**
   * set this._networkConnected = undefined at initial to
   * prevent discarding of very first of network disconnect event.
   */
  this._networkConnected = undefined
  /**
   * this._loggedIn could be used to determine if current session
   * is once connected to internet.
   */
  this._loggedIn = false
}

/**
 * Fires when the network is connected.
 * @private
 */
Custodian.prototype.onNetworkConnect = function onNetworkConnect () {
  if (this._networkConnected) {
    return
  }
  this._networkConnected = true
  logger.info('on network connect')

  this.runtime.reconnect()
  /** Announce last installed ota changelog and clean up ota files */
  ota.getInfoIfFirstUpgradedBoot((err, info) => {
    if (err) {
      logger.error('failed to fetch upgraded info, skipping', err && err.stack)
      return
    }
    if (info == null) {
      logger.info('no available updates found on start up')
      return
    }
    this.startApp('@ota', { intent: 'on_first_boot_after_upgrade', _info: info }, {})
  })
}

/**
 * Fires when the network is disconnected.
 * @private
 */
Custodian.prototype.onNetworkDisconnect = function onNetworkDisconnect () {
  if (this._networkConnected === false) {
    return
  }
  this._networkConnected = false
  logger.info('on network disconnect, once logged in?', this._loggedIn)
  this.runtime.wormhole.setOffline()

  if (this._loggedIn) {
    // waiting for user awake or button event in order to switch to network config
    logger.log('network switch, try to relogin, waiting for user awake or button event')
    return
  }
  logger.log('network disconnected, please connect to wifi first')
  this.runtime.startApp('@network', {
    intent: 'system_setup'
  }, {})
}

Custodian.prototype.onLoggedIn = function onLoggedIn () {
  this._loggedIn = true
  logger.info('on logged in')
}

/**
 * Reset network and start procedure of configuring network.
 */
Custodian.prototype.resetNetwork = function resetNetwork () {
  logger.log('reset network')
  wifi.resetWifi()
  wifi.disableAll()

  this._networkConnected = false
  this._loggedIn = false
  return this.runtime.startApp('@network', {
    intent: 'manual_setup'
  }, {})
}

Custodian.prototype.isPrepared = function isPrepared () {
  return this._networkConnected && this._loggedIn
}

Custodian.prototype.isNetworkUnavailable = function isNetworkUnavailable () {
  return !this._networkConnected && this._loggedIn
}

Custodian.prototype.isRegistering = function isRegistering () {
  return this._networkConnected && !this._loggedIn
}

Custodian.prototype.isConfiguringNetwork = function isConfiguringNetwork () {
  return !(this._networkConnected || this._loggedIn)
}

Custodian.prototype.prepareNetwork = function prepareNetwork () {
  if (wifi.getNetworkState() === wifi.NETSERVER_CONNECTED) {
    this.onNetworkConnect()
  } else {
    this.onNetworkDisconnect()
  }
}
