'use strict'

var protocol = require('./protocol.json')

var stateFilters = [
  // turn on bluetooth succeeded
  {
    inflowMsg: {a2dpstate: 'opened', connect_state: 'invalid', play_state: 'invalid', broadcast_state: 'opened'},
    outflowEvent: {type: 'radio_state_changed', state: protocol.RADIO_STATE.ON},
    extraDataGenerator: (msg) => {
      return {autoConn: msg.linknum > 0}
    }
  },
  // turn off bluetooth
  {
    inflowMsg: {a2dpstate: 'closed', connect_state: 'invalid', play_state: 'invalid', broadcast_state: 'closed'},
    outflowEvent: {type: 'radio_state_changed', state: protocol.RADIO_STATE.OFF}
  },
  // turn on bluetooth failed
  {
    inflowMsg: {a2dpstate: 'open failed', connect_state: 'invalid', play_state: 'invalid'},
    outflowEvent: {type: 'radio_state_changed', state: protocol.RADIO_STATE.OPEN_FAILED}
  },
  // connect to remote device succeeded
  {
    inflowMsg: {a2dpstate: 'opened', connect_state: 'connected', play_state: 'invalid', broadcast_state: 'closed'},
    outflowEvent: {type: 'connection_state_changed', state: protocol.CONNECTION_STATE.CONNECTED},
    extraDataGenerator: (msg) => {
      return {'address': msg.connect_address, 'name': msg.connect_name}
    }
  },
  // disconnect from remote device
  {
    inflowMsg: {a2dpstate: 'opened', connect_state: 'disconnected', play_state: 'invalid', broadcast_state: 'opened'},
    outflowEvent: {type: 'connection_state_changed', state: protocol.CONNECTION_STATE.DISCONNECTED}
  },
  // connect to remote device failed
  {
    inflowMsg: {a2dpstate: 'opened', connect_state: 'connect failed'},
    outflowEvent: {type: 'connection_state_changed', state: protocol.CONNECTION_STATE.CONNECT_FAILED}
  },
  // auto connect to history paired device failed
  {
    inflowMsg: {a2dpstate: 'opened', connect_state: 'connect over'},
    outflowEvent: {type: 'connection_state_changed', state: protocol.CONNECTION_STATE.AUTOCONNECT_FAILED}
  },
  // started music
  {
    inflowMsg: {mode: 'A2DP_SINK', a2dpstate: 'opened', connect_state: 'connected', play_state: 'played', broadcast_state: 'closed'},
    outflowEvent: {type: 'audio_state_changed', state: protocol.AUDIO_STATE.PLAYING}
  },
  // stopped music
  {
    inflowMsg: {mode: 'A2DP_SINK', a2dpstate: 'opened', connect_state: 'connected', play_state: 'stopped', broadcast_state: 'closed'},
    outflowEvent: {type: 'audio_state_changed', state: protocol.AUDIO_STATE.STOPPED}
  },
  // discoverable
  {
    lastInflowMsg: {broadcast_state: 'closed'},
    inflowMsg: {broadcast_state: 'opened'},
    outflowEvent: {type: 'discovery_state_changed', state: protocol.DISCOVERY_STATE.ON}
  },
  // undiscoverable
  {
    lastInflowMsg: {broadcast_state: 'opened'},
    inflowMsg: {broadcast_state: 'closed'},
    outflowEvent: {type: 'discovery_state_changed', state: protocol.DISCOVERY_STATE.OFF}
  }
]

exports.stateFilters = stateFilters
