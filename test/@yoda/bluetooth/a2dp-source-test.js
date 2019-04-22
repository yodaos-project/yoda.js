'use strict'

var protocol = require('@yoda/bluetooth').protocol
var testCases = [
  {
    exec: (adapter) => { adapter.open(protocol.A2DP_MODE.SOURCE) },
    sendMsg: { command: 'ON', unique: true }
  },
  {
    exec: (adapter) => { adapter.connect('01:23:45:67:89:AB', 'test device 123') },
    sendMsg: { command: 'CONNECT', address: '01:23:45:67:89:AB', name: 'test device 123' }
  },
  {
    exec: (adapter) => { adapter.disconnect() },
    sendMsg: { command: 'DISCONNECT' }
  },
  {
    exec: (adapter) => { adapter.discovery() },
    sendMsg: { command: 'DISCOVERY' }
  },
  {
    exec: (adapter) => { adapter.close() },
    sendMsg: { command: 'OFF' }
  }
]

module.exports = {
  subject: 'A2DP-SOURCE',
  profile: protocol.PROFILE.A2DP,
  testCases: testCases,
  ipcUrl: 'unix:/var/run/flora.sock',
  eventName: 'bluetooth.a2dpsource.command'
}
