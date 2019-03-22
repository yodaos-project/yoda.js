'use strict'

var protocol = require('@yoda/bluetooth').protocol
var testCases = [
  {
    exec: (adapter) => { adapter.open() },
    sendMsg: { command: 'ON', unique: false }
  },
  {
    exec: (adapter) => { adapter.answer() },
    sendMsg: { command: 'ANSWERCALL' }
  },
  {
    exec: (adapter) => { adapter.hangup() },
    sendMsg: { command: 'HANGUP' }
  },
  {
    exec: (adapter) => { adapter.dial('13857130277') },
    sendMsg: { command: 'DIALING', NUMBER: '13857130277' }
  },
  {
    exec: (adapter) => { adapter.close() },
    sendMsg: { command: 'OFF' }
  }
]

module.exports = {
  subject: 'HFP',
  profile: protocol.PROFILE.HFP,
  testCases: testCases,
  ipcUrl: 'unix:/var/run/flora.sock',
  eventName: 'bluetooth.hfp.command'
}
