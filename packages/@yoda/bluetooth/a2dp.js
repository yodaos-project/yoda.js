'use strict'

var bluetooth = require('@yoda/bluetooth')
var util = require('@yoda/util')._
var logger = require('logger')('bluetooth-a2dp')

var localName = null

var a2dpSink = null
var a2dpSource = null
var lastMode = bluetooth.A2DP_MODE_SNK

var radioStateChangedListener = []
var discoveryChangedListener = []
var connectionStateChangedListener = []
var audioStateChangedListener = []

function BluetoothA2dp (deviceName) {
  localName = deviceName
  lastMode = bluetooth.A2DP_MODE_SNK

  if (a2dpSink == null) {
    var A2dpSink = require('./player').BluetoothPlayer
    a2dpSink = new A2dpSink()
  }
  a2dpSink.on('opened', function (autoConn) {
    logger.debug(`on a2dpSink.emit opened: autoConn:${autoConn}`)
    radioStateChangedListener.forEach(function (listener) {
      listener(bluetooth.A2DP_MODE_SNK, bluetooth.RADIO_STATE_ON, {autoConn: autoConn})
    })
  })
  a2dpSink.on('open failed', function () {
    logger.debug('on a2dpSink.emit open failed')
    radioStateChangedListener.forEach(function (listener) {
      listener(bluetooth.A2DP_MODE_SNK, bluetooth.RADIO_STATE_ON_FAILED)
    })
  })
  a2dpSink.on('closed', function () {
    logger.debug('on a2dpSink.emit closed')
    radioStateChangedListener.forEach(function (listener) {
      listener(bluetooth.A2DP_MODE_SNK, bluetooth.RADIO_STATE_OFF)
    })
  })
  a2dpSink.on('connected', function (remoteDevice) {
    logger.debug(`on a2dpSink.emit connected: ${JSON.stringify(remoteDevice)}`)
    connectionStateChangedListener.forEach(function (listener) {
      listener(bluetooth.A2DP_MODE_SNK, bluetooth.CONNECTION_STATE_CONNECTED, remoteDevice)
    })
  })
  a2dpSink.on('disconnected', function () {
    logger.debug('on a2dpSink.emit disconnected')
    connectionStateChangedListener.forEach(function (listener) {
      listener(bluetooth.A2DP_MODE_SNK, bluetooth.CONNECTION_STATE_DISCONNECTED)
    })
  })
  a2dpSink.on('connect failed', function () {
    logger.debug('on a2dpSink.emit connect failed')
    connectionStateChangedListener.forEach(function (listener) {
      listener(bluetooth.A2DP_MODE_SNK, bluetooth.CONNECTION_STATE_CONNECT_FAILED)
    })
  })
  a2dpSink.on('autoconnect failed', function () {
    logger.debug('on a2dpSink.emit autoconnect failed')
    connectionStateChangedListener.forEach(function (listener) {
      listener(bluetooth.A2DP_MODE_SNK, bluetooth.CONNECTION_STATE_AUTOCONNECT_FAILED)
    })
  })
  a2dpSink.on('played', function () {
    logger.debug('on a2dpSink.emit played')
    audioStateChangedListener.forEach(function (listener) {
      listener(bluetooth.A2DP_MODE_SNK, bluetooth.AUDIO_STATE_PLAYING)
    })
  })
  a2dpSink.on('paused', function () {
    logger.debug('on a2dpSink paused')
    audioStateChangedListener.forEach(function (listener) {
      listener(bluetooth.A2DP_MODE_SNK, bluetooth.AUDIO_STATE_PAUSED)
    })
  })
  a2dpSink.on('stopped', function () {
    logger.debug('on a2dpSink.emit stopped')
    audioStateChangedListener.forEach(function (listener) {
      listener(bluetooth.A2DP_MODE_SNK, bluetooth.AUDIO_STATE_STOPPED)
    })
  })
  a2dpSink.on('volume changed', function (vol) {
    logger.debug(`on a2dpSink.emit volume-changed(${vol})`)
    audioStateChangedListener.forEach(function (listener) {
      listener(bluetooth.A2DP_MODE_SNK, bluetooth.AUDIO_STATE_VOLUMN_CHANGED, {volumn: vol})
    })
  })
  a2dpSink.on('discoverable', function () {
    logger.debug('on a2dpSink.emit discoverable')
    discoveryChangedListener.forEach(function (listener) {
      listener(bluetooth.A2DP_MODE_SNK, bluetooth.DISCOVERY_STATE_ON)
    })
  })
  a2dpSink.on('undiscoverable', function () {
    logger.debug('on a2dpSink.emit undiscoverable')
    discoveryChangedListener.forEach(function (listener) {
      listener(bluetooth.A2DP_MODE_SNK, bluetooth.DISCOVERY_STATE_OFF)
    })
  })
  a2dpSink.on('error', function (err) {
    logger.error(`on a2dpSink.emit error(${JSON.stringify(err)})`)
  })

  if (a2dpSource == null) {
    var A2dpSource = require('./source').BluetoothSource
    a2dpSource = new A2dpSource()
  }
  a2dpSource.on('opened', function (autoConn) {
    logger.debug(`on a2dpSource.emit opened: autoConn:${autoConn}`)
    radioStateChangedListener.forEach(function (listener) {
      listener(bluetooth.A2DP_MODE_SRC, bluetooth.RADIO_STATE_ON, {autoConn: autoConn})
    })
  })
  a2dpSource.on('open failed', function () {
    logger.debug('on a2dpSource.emit open failed')
    radioStateChangedListener.forEach(function (listener) {
      listener(bluetooth.A2DP_MODE_SRC, bluetooth.RADIO_STATE_ON_FAILED)
    })
  })
  a2dpSource.on('closed', function () {
    logger.debug('on a2dpSource.emit closed')
    radioStateChangedListener.forEach(function (listener) {
      listener(bluetooth.A2DP_MODE_SRC, bluetooth.RADIO_STATE_OFF)
    })
  })
  a2dpSource.on('connected', function (remoteDevice) {
    logger.debug(`on a2dpSource.emit connected: ${JSON.stringify(remoteDevice)}`)
    connectionStateChangedListener.forEach(function (listener) {
      listener(bluetooth.A2DP_MODE_SRC, bluetooth.CONNECTION_STATE_CONNECTED, remoteDevice)
    })
  })
  a2dpSource.on('disconnected', function () {
    logger.debug('on a2dpSource.emit disconnected')
    connectionStateChangedListener.forEach(function (listener) {
      listener(bluetooth.A2DP_MODE_SRC, bluetooth.CONNECTION_STATE_DISCONNECTED)
    })
  })
  a2dpSource.on('connect failed', function () {
    logger.debug('on a2dpSource.emit connect failed')
    connectionStateChangedListener.forEach(function (listener) {
      listener(bluetooth.A2DP_MODE_SRC, bluetooth.CONNECTION_STATE_CONNECT_FAILED)
    })
  })
  a2dpSource.on('autoconnect failed', function () {
    logger.debug('on a2dpSource.emit autoconnect failed')
    connectionStateChangedListener.forEach(function (listener) {
      listener(bluetooth.A2DP_MODE_SRC, bluetooth.CONNECTION_STATE_AUTOCONNECT_FAILED)
    })
  })
  a2dpSource.on('discovery', function (results) {
    logger.debug(`on a2dpSource.emit discovery: ${results.deviceList.length} devices, is_comp: ${results.is_completed}`)
    discoveryChangedListener.forEach(function (listener) {
      listener(bluetooth.A2DP_MODE_SRC, bluetooth.DISCOVERY_DEVICE_LIST_CHANGED, results)
    })
  })
  a2dpSource.on('error', function (err) {
    logger.error(`on a2dpSource.emit error(${JSON.stringify(err)})`)
  })
}

BluetoothA2dp.prototype.open = function open (mode, options) {
  if (mode === undefined) {
    mode = lastMode
  }
  var autoplay = util.get(options, 'autoplay', false)
  logger.debug(`open(${lastMode}=>${mode}, autoplay:${autoplay})`)
  lastMode = mode
  if (mode === bluetooth.A2DP_MODE_SRC) {
    return a2dpSource.open(localName)
  } else {
    return a2dpSink.open(localName, autoplay)
  }
}

BluetoothA2dp.prototype.close = function close () {
  logger.debug(`close(${lastMode})`)
  if (lastMode === bluetooth.A2DP_MODE_SRC) {
    return a2dpSource.close()
  } else {
    return a2dpSink.close()
  }
}
BluetoothA2dp.prototype.end = function end () {
  this.close()
}

BluetoothA2dp.prototype.connect = function connect (addr, name) {
  logger.debug(`connect(${lastMode})`)
  if (lastMode === bluetooth.A2DP_MODE_SRC) {
    return a2dpSource.connect(addr, name)
  } else {
    return a2dpSink.connect(addr, name)
  }
}

BluetoothA2dp.prototype.disconnect = function disconnect () {
  logger.debug(`disconnect(${lastMode})`)
  if (lastMode === bluetooth.A2DP_MODE_SRC) {
    return a2dpSource.disconnect()
  } else {
    return a2dpSink.disconnect()
  }
}

BluetoothA2dp.prototype.mute = function mute () {
  logger.debug(`mute(${lastMode})`)
  if (lastMode === bluetooth.A2DP_MODE_SNK) {
    return a2dpSink.mute()
  } else {
    return false
  }
}

BluetoothA2dp.prototype.unmute = function unmute () {
  logger.debug(`unmute(${lastMode})`)
  if (lastMode === bluetooth.A2DP_MODE_SNK) {
    return a2dpSink.unmute()
  } else {
    return false
  }
}

BluetoothA2dp.prototype.start = function start () {
  logger.debug(`start(${lastMode})`)
  if (lastMode === bluetooth.A2DP_MODE_SNK) {
    return a2dpSink.start()
  } else {
    return false
  }
}

BluetoothA2dp.prototype.pause = function pause () {
  logger.debug(`pause(${lastMode})`)
  if (lastMode === bluetooth.A2DP_MODE_SNK) {
    return a2dpSink.pause()
  } else {
    return false
  }
}

BluetoothA2dp.prototype.stop = function stop () {
  logger.debug(`stop(${lastMode})`)
  if (lastMode === bluetooth.A2DP_MODE_SNK) {
    return a2dpSink.stop()
  } else {
    return false
  }
}

BluetoothA2dp.prototype.prev = function prev () {
  logger.debug(`prev(${lastMode})`)
  if (lastMode === bluetooth.A2DP_MODE_SNK) {
    return a2dpSink.prev()
  } else {
    return false
  }
}

BluetoothA2dp.prototype.next = function next () {
  logger.debug(`next(${lastMode})`)
  if (lastMode === bluetooth.A2DP_MODE_SNK) {
    return a2dpSink.next()
  } else {
    return false
  }
}

BluetoothA2dp.prototype.discovery = function discovery () {
  logger.debug(`discovery(${lastMode})`)
  if (lastMode === bluetooth.A2DP_MODE_SRC) {
    return a2dpSource.discovery()
  } else {
    return false
  }
}

/**
 * Some status query functions.
 */
BluetoothA2dp.prototype.getMode = function getMode () {
  return lastMode
}

BluetoothA2dp.prototype.isOpened = function isOpened () {
  if (lastMode === bluetooth.A2DP_MODE_SRC) {
    return a2dpSource.isOpened()
  } else {
    return a2dpSink.isOpened()
  }
}

BluetoothA2dp.prototype.isConnected = function isConnected () {
  if (lastMode === bluetooth.A2DP_MODE_SRC) {
    return a2dpSource.isConnected()
  } else {
    return a2dpSink.isConnected()
  }
}

BluetoothA2dp.prototype.getConnectedDevice = function getConnectedDevice () {
  if (lastMode === bluetooth.A2DP_MODE_SRC) {
    return a2dpSource.getConnectedDevice()
  } else {
    return a2dpSink.getConnectedDevice()
  }
}

BluetoothA2dp.prototype.isPlaying = function isPlaying () {
  if (lastMode === bluetooth.A2DP_MODE_SNK) {
    return a2dpSink.isPlaying()
  } else {
    return false
  }
}

BluetoothA2dp.prototype.isDiscoverable = function isDiscoverable () {
  if (lastMode === bluetooth.A2DP_MODE_SNK) {
    return a2dpSink.isDiscoverable()
  } else {
    return a2dpSource.isDiscoverable()
  }
}

BluetoothA2dp.prototype.registerOnRadioStateChangedListener = function registerOnRadioStateChangedListener (listener) {
  if (listener != null && typeof listener === 'function') {
    var index = radioStateChangedListener.indexOf(listener)
    if (index === -1) {
      radioStateChangedListener.push(listener)
    }
  }
}
BluetoothA2dp.prototype.unregisterOnRadioStateChangedListener = function unregisterOnRadioStateChangedListener (listener) {
  if (listener != null && typeof listener === 'function') {
    var index = radioStateChangedListener.indexOf(listener)
    if (index !== -1) {
      radioStateChangedListener.splice(index, 1)
    }
  }
}

BluetoothA2dp.prototype.registerOnConnectionStateChangedListener = function registerOnConnectionStateChangedListener (listener) {
  if (listener != null && typeof listener === 'function') {
    var index = connectionStateChangedListener.indexOf(listener)
    if (index === -1) {
      connectionStateChangedListener.push(listener)
    }
  }
}
BluetoothA2dp.prototype.unregisterOnConnectionStateChangedListener = function unregisterOnConnectionStateChangedListener (listener) {
  if (listener != null && typeof listener === 'function') {
    var index = connectionStateChangedListener.indexOf(listener)
    if (index !== -1) {
      connectionStateChangedListener.splice(index, 1)
    }
  }
}

BluetoothA2dp.prototype.registerOnAudioStateChangedListener = function registerOnAudioStateChangedListener (listener) {
  if (listener != null && typeof listener === 'function') {
    var index = audioStateChangedListener.indexOf(listener)
    if (index === -1) {
      audioStateChangedListener.push(listener)
    }
  }
}
BluetoothA2dp.prototype.unregisterOnAudioStateChangedListener = function unregisterOnAudioStateChangedListener (listener) {
  if (listener != null && typeof listener === 'function') {
    var index = audioStateChangedListener.indexOf(listener)
    if (index !== -1) {
      audioStateChangedListener.splice(index, 1)
    }
  }
}

BluetoothA2dp.prototype.registerOnDiscoveryChangedListener = function registerOnDiscoveryChangedListener (listener) {
  if (listener != null && typeof listener === 'function') {
    var index = discoveryChangedListener.indexOf(listener)
    if (index === -1) {
      discoveryChangedListener.push(listener)
    }
  }
}
BluetoothA2dp.prototype.unregisterOnDiscoveryChangedListener = function unregisterOnDiscoveryChangedListener (listener) {
  if (listener != null && typeof listener === 'function') {
    var index = discoveryChangedListener.indexOf(listener)
    if (index !== -1) {
      discoveryChangedListener.splice(index, 1)
    }
  }
}

/**
 * Disconnect the event socket, this is deprecated please use `.destroyConnection()`
 * instead.
 */
BluetoothA2dp.prototype.disconnectConnection = function disconnectConnection () {
  a2dpSink.disconnectConnection()
  a2dpSource.disconnectConnection()
  a2dpSink = null
  a2dpSource = null
}

/**
 * Destroy the connection to bluetooth service, this firstly sends the OFF command
 * and destroy the connection.
 */
BluetoothA2dp.prototype.destroyConnection = function destroyConnection () {
  a2dpSink.destroyConnection()
  a2dpSource.destroyConnection()
  a2dpSink = null
  a2dpSource = null
}

exports.BluetoothA2dp = BluetoothA2dp
