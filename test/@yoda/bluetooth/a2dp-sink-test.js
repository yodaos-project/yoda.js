'use strict'

var protocol = require('@yoda/bluetooth').protocol
var testCases = [
  {
    exec: (adapter) => { adapter.open() },
    sendMsg: { command: 'ON', unique: true, sec_pro: 'HFP' }
  },
  {
    exec: (adapter) => { adapter.open(protocol.A2DP_MODE.SINK, {autoplay: true}) },
    sendMsg: { command: 'ON', unique: true, subsequent: 'PLAY', sec_pro: 'HFP' }
  },
  {
    exec: (adapter) => { adapter.mute() },
    sendMsg: { command: 'MUTE' }
  },
  {
    exec: (adapter) => { adapter.unmute() },
    sendMsg: { command: 'UNMUTE' }
  },
  {
    exec: (adapter) => { adapter.play() },
    sendMsg: { command: 'PLAY_UNMUTE' }
  },
  {
    exec: (adapter) => { adapter.pause() },
    sendMsg: { command: 'PAUSE_MUTE' }
  },
  {
    exec: (adapter) => { adapter.stop() },
    sendMsg: { command: 'STOP' }
  },
  {
    exec: (adapter) => { adapter.syncVol(75) },
    sendMsg: { command: 'VOLUME', value: 75 }
  },
  {
    exec: (adapter) => { adapter.prev() },
    sendMsg: [ { command: 'UNMUTE' }, { command: 'PREV' } ]
  },
  {
    exec: (adapter) => { adapter.next() },
    sendMsg: [ { command: 'UNMUTE' }, { command: 'NEXT' } ]
  },
  {
    exec: (adapter) => { adapter.query() },
    sendMsg: { command: 'GETSONG_ATTRS' }
  },
  {
    exec: (adapter) => { adapter.disconnect() },
    sendMsg: { command: 'DISCONNECT' }
  },
  {
    exec: (adapter) => { adapter.close() },
    sendMsg: { command: 'OFF', sec_pro: 'HFP' }
  }
]

module.exports = {
  subject: 'A2DP-SINK',
  profile: protocol.PROFILE.A2DP,
  testCases: testCases,
  ipcUrl: 'unix:/var/run/flora.sock',
  eventName: 'bluetooth.a2dpsink.command'
}
