'use strict'

var protocol = require('./protocol.json')

var stateFilters = [
  // turn on bluetooth succeeded
  {
    inflowMsg: {hfpstate: 'opened', connect_state: 'invalid', call: 'inactive', setup: 'none', held: 'none'},
    outflowEvent: {type: 'radio_state_changed', state: protocol.RADIO_STATE.ON}
  },
  // turn off bluetooth
  {
    inflowMsg: {hfpstate: 'closed', connect_state: 'invalid', call: 'inactive', setup: 'none', held: 'none'},
    outflowEvent: {type: 'radio_state_changed', state: protocol.RADIO_STATE.OFF}
  },
  // turn on bluetooth failed
  {
    inflowMsg: {hfpstate: 'open failed', connect_state: 'invalid', call: 'inactive', setup: 'none', held: 'none'},
    outflowEvent: {type: 'radio_state_changed', state: protocol.RADIO_STATE.OPEN_FAILED}
  },
  // connect to remote device succeeded
  {
    inflowMsg: {hfpstate: 'opened', connect_state: 'connected', call: 'inactive', setup: 'none', held: 'none'},
    outflowEvent: {type: 'connection_state_changed', state: protocol.CONNECTION_STATE.CONNECTED},
    extraDataGenerator: (msg) => {
      return {'address': msg.connect_address, 'name': msg.connect_name}
    }
  },
  // disconnect from remote device
  {
    inflowMsg: {hfpstate: 'opened', connect_state: 'disconnected', call: 'inactive', setup: 'none', held: 'none'},
    outflowEvent: {type: 'connection_state_changed', state: protocol.CONNECTION_STATE.DISCONNECTED}
  },
  // connect to remote device failed
  {
    inflowMsg: {hfpstate: 'opened', connect_state: 'connect failed'},
    outflowEvent: {type: 'connection_state_changed', state: protocol.CONNECTION_STATE.CONNECT_FAILED}
  },
  // incoming call
  {
    inflowMsg: {hfpstate: 'opened', connect_state: 'connected', call: 'inactive', setup: 'incoming'},
    outflowEvent: {type: 'call_state_changed', state: protocol.CALL_STATE.INCOMING}
  },
  // call end
  {
    inflowMsg: {hfpstate: 'opened', connect_state: 'connected', call: 'inactive', setup: 'none'},
    outflowEvent: {type: 'call_state_changed', state: protocol.CALL_STATE.IDLE}
  },
  // call connected
  {
    inflowMsg: {hfpstate: 'opened', connect_state: 'connected', call: 'active', setup: 'none', audio: 'on'},
    outflowEvent: {type: 'call_state_changed', state: protocol.CALL_STATE.OFFHOOK}
  },
  {
    inflowMsg: {hfpstate: 'opened', connect_state: 'connected', call: 'inactive', setup: 'outgoing', audio: 'off'},
    outflowEvent: {type: 'call_state_changed', state: protocol.CALL_STATE.OFFHOOK}
  }
]

exports.stateFilters = stateFilters
