'use strict'

var assert = require('assert')

module.exports = Mock

function Mock () {
  this.networkStatus = {state: 'DISCONNECT'}
  this.wifiStatus = {state: 'DISCONNECT'}
}

Mock.prototype._handleWifiCommand = function (msg) {
  var result = null

  switch (msg.command) {
    case 'GET_STATUS':
      result = {
        wifi: this.wifiStatus,
        result: 'OK'
      }
      return { retCode: 0, msg: [JSON.stringify(result)] }

    case 'CONNECT':
      this.wifiStatus = {state: 'CONNECTED'}
      this.networkStatus = {state: 'CONNECTED'}
      return { retCode: 0, msg: [JSON.stringify({result: 'OK'})] }

    case 'DISCONNECT':
      this.wifiStatus = {state: 'DISCONNECTED'}
      this.networkStatus = {state: 'DISCONNECTED'}
      return { retCode: 0, msg: [JSON.stringify({result: 'OK'})] }

    case 'START_SCAN':
    case 'STOP_SCAN':
      return { retCode: 0, msg: [JSON.stringify({result: 'OK'})] }

    case 'GET_WIFILIST':
      result = {
        wifilist: [
          {ssid: 'test', signal: -50},
          {ssid: 'guest', signal: -50}
        ],
        result: 'OK'
      }
      return { retCode: 0, msg: [JSON.stringify(result)] }
  }
}

Mock.prototype.deinit = function () {
}

Mock.prototype.call = function (command, caps) {
  assert.strictEqual(command, 'network.command')
  var msg = JSON.parse(caps[0])
  var result = null

  if (msg.device === 'WIFI') {
    result = this._handleWifiCommand(msg)
  }

  return Promise.resolve(result)
}

Mock.prototype.subscribe = function (command, fn) {
  assert.strictEqual(command, 'network.status')

  setTimeout(() => {
    fn([JSON.stringify({network: this.networkStatus})])
    fn([JSON.stringify({wifi: this.wifiStatus})])
  }, 500)
}
