'use strict'

var bluetooth = require('@yoda/bluetooth')
var logger = require('logger')('bluetooth-app')
var property = require('@yoda/property')
var wifi = require('@yoda/wifi')
var util = require('@yoda/util')._

module.exports = function (activity) {
  var a2dp = null
  var uuid = (property.get('ro.boot.serialno') || '').substr(-6)
  var productName = property.get('ro.rokid.build.productname') || 'Rokid-Me'
  var myDeviceName = [ productName, uuid ].join('-')
  var nameToSpeak = [ productName, `<num=tel>${uuid}</num>` ].join('')
  var textTable = require('./texts.json')
  var BLUETOOTH_MUSIC_ID = 'RDDE53259D334860BA9E98CB3AB6C001'
  var eventConvertor = {
    'opened': 'ON_OPENED',
    'closed': 'ON_CLOSED',
    'open_failed': 'ON_OPENED_FAILED',
    'connected': 'ON_CONNECTED',
    'disconnected': 'ON_DISCONNECTED',
    'connect_failed': 'ON_CONNECTED_FAILED',
    'discovery': 'ON_DEVICE_LIST_CHANGE'
  }
  var needResume = false
  var lastIntent = null

  function afterSpeak () {
    logger.log(`after speak(is playing = ${a2dp.isPlaying()})`)
    if (!a2dp.isPlaying()) {
      activity.setBackground()
    } else {
      a2dp.start()
    }
  }

  function speak (text, snd) {
    logger.debug(`speak: ${text}`)
    return activity.setForeground().then(() => {
      var wifiState = wifi.getWifiState()
      logger.debug(`wifi state = ${wifiState}`)
      if (wifi.getWifiState() === wifi.WIFI_CONNECTED) {
        logger.debug(`Now play tts: ${text}`)
        return activity.tts.speak(text, { impatient: false }).then(() => {
          afterSpeak()
        })
      } else if (snd != null) {
        logger.debug('No wifi connection, play default voice.')
        return activity.playSound(snd).then(() => {
          afterSpeak()
        })
      } else {
        afterSpeak()
      }
    })
  }

  function sendMsgToApp (event, data) {
    var msg = {
      'type': 'Bluetooth',
      'event': eventConvertor[event]
    }
    if (data !== undefined && data != null) {
      msg.template = JSON.stringify(data)
    }
    return activity.wormhole.sendToApp('event', JSON.stringify(msg))
  }

  function onRadioStateChangedListener (mode, state, extra) {
    logger.debug(`${mode} onRadioStateChanged(${state})`)

    switch (state) {
      case bluetooth.RADIO_STATE_ON:
        if (mode === bluetooth.A2DP_MODE_SRC) {
          sendMsgToApp('opened')
        }
        var autoConn = util.get(extra, 'autoConn', false)
        if (autoConn) {
          speak(textTable['STRING_BROADCAST'], 'system://openbluetooth.ogg')
        } else { // No connection history
          if (lastIntent === 'connect_phone' || lastIntent === 'connect_speaker') {
            speak(textTable['STRING_CONNECT_MOBILE'] + textTable['STRING_OPEN_BEGIN'] + nameToSpeak + textTable['STRING_CONNECT_MOBILE_END'], 'system://openbluetooth.ogg')
          } else {
            speak(textTable['STRING_BROADCAST'] + textTable['STRING_OPEN_BEGIN'] + nameToSpeak + textTable['STRING_OPEN_END'], 'system://openbluetooth.ogg')
          }
        }
        break
      case bluetooth.RADIO_STATE_ON_FAILED:
        if (mode === bluetooth.A2DP_MODE_SRC) {
          sendMsgToApp('open_failed')
        }
        speak(textTable['STRING_OPENFAILED'], 'system://openbluetootherror.ogg')
        break
      case bluetooth.RADIO_STATE_OFF:
        if (mode === bluetooth.A2DP_MODE_SRC) {
          sendMsgToApp('closed')
        }
        speak(textTable['STRING_CLOSED'], 'system://closebluetooth.ogg')
        break
    }
  }

  function onConnectionStateChangedListener (mode, state, device) {
    logger.debug(`${mode} onConnectionStateChanged(${state})`)

    switch (state) {
      case bluetooth.CONNECTION_STATE_CONNECTED:
        if (mode === bluetooth.A2DP_MODE_SRC) {
          var data = {'currentDevice': device}
          sendMsgToApp('connected', data)
        }
        speak(`${textTable['STRING_CONNECED']}${device.name}`, 'system://connectbluetooth.ogg')
        break

      case bluetooth.CONNECTION_STATE_DISCONNECTED:
        if (mode === bluetooth.A2DP_MODE_SRC) {
          sendMsgToApp('disconnected')
        }
        speak(textTable['STRING_DISCONNECT_LINK'])
        break

      case bluetooth.CONNECTION_STATE_CONNECT_FAILED:
        if (mode === bluetooth.A2DP_MODE_SRC) {
          sendMsgToApp('connect_failed')
        }
        break

      case bluetooth.CONNECTION_STATE_AUTOCONNECT_FAILED:
        speak(textTable['STRING_CONNECT_MOBILE'] + textTable['STRING_OPEN_BEGIN'] + nameToSpeak + textTable['STRING_CONNECT_MOBILE_END'], 'system://openbluetooth.ogg')
        break
    }
  }

  function onAudioStateChangedListener (mode, state, extra) {
    logger.debug(`${mode} onAudioStateChanged(${state})`)

    switch (state) {
      case bluetooth.AUDIO_STATE_PLAYING:
        activity.setForeground({ form: 'scene', skillId: BLUETOOTH_MUSIC_ID })
        break

      case bluetooth.AUDIO_STATE_PAUSED:
      case bluetooth.AUDIO_STATE_STOPPED:
        break

      case bluetooth.AUDIO_STATE_VOLUMN_CHANGED:
        break
    }
  }

  function onDiscoveryChangedListener (mode, state, extra) {
    logger.debug(`${mode} onDiscoveryChanged(${state})`)

    switch (state) {
      case bluetooth.DISCOVERY_STATE_ON:
        activity.light.play('system://bluetoothOpen.js', {}, { shouldResume: true })
          .catch((err) => {
            logger.error('bluetooth play light error: ', err)
          })
        break

      case bluetooth.DISCOVERY_STATE_OFF:
        activity.light.stop('system://bluetoothOpen.js')
        break

      case bluetooth.DISCOVERY_DEVICE_LIST_CHANGED:
        sendMsgToApp('discovery', extra)
        speak(`Found ${extra.deviceList.length} devices.`)
        break
    }
  }

  activity.on('create', () => {
    logger.log(`activity.onCreate()`)
    a2dp = bluetooth.getAdapter(bluetooth.PROFILE_A2DP)
    a2dp.registerOnRadioStateChangedListener(onRadioStateChangedListener)
    a2dp.registerOnConnectionStateChangedListener(onConnectionStateChangedListener)
    a2dp.registerOnAudioStateChangedListener(onAudioStateChangedListener)
    a2dp.registerOnDiscoveryChangedListener(onDiscoveryChangedListener)
  })

  activity.on('pause', () => {
    var isPlaying = a2dp.isPlaying()
    logger.log(`activity.onPause(isPlaying: ${isPlaying})`)
    if (isPlaying) {
      needResume = true
      a2dp.pause()
    }
  })

  activity.on('resume', () => {
    logger.log(`activity.onResume(needResume: ${needResume})`)
    if (needResume) {
      needResume = false
      a2dp.unmute()
      a2dp.start()
    }
  })

  activity.on('destroy', () => {
    logger.log('activity.onDestroy()')
    a2dp.unregisterOnRadioStateChangedListener()
    a2dp.unregisterOnConnectionStateChangedListener()
    a2dp.unregisterOnAudioStateChangedListener()
    a2dp.unregisterOnDiscoveryChangedListener()
    bluetooth.recycle(bluetooth.PROFILE_A2DP)
  })

  activity.on('request', function (nlp, action) {
    lastIntent = nlp.intent
    logger.log(`activity.onNlpRequest(intent: ${nlp.intent})`)
    switch (nlp.intent) {
      case 'ask_bluetooth':
        speak(textTable['STRING_ASK'])
        break
      case 'bluetooth_broadcast':
        a2dp.open()
        break
      case 'connect_phone':
        a2dp.open(bluetooth.A2DP_MODE_SNK)
        break
      case 'connect_speaker':
        a2dp.open(bluetooth.A2DP_MODE_SRC)
        break
      case 'bluetooth_disconnect':
      case 'disconnect_phone':
      case 'disconnect_devices':
      case 'disconnect_speaker':
        a2dp.close()
        break
      case 'play_bluetoothmusic':
        activity.openUrl('yoda-skill://bluetooth_music/bluetooth_start_bluetooth_music', 'scene')
        break
      case 'resume':
        a2dp.start()
        break
      case 'stop':
        a2dp.pause()
        break
      case 'pre':
        a2dp.prev()
        break
      case 'next':
        a2dp.next()
        break
      case 'like':
        speak(textTable['STRING_LIKE'])
        break
      default:
        speak(textTable['STRING_FALLBACK'])
        break
    }
  })

  activity.on('url', url => {
    logger.log(`activity.onUrl(${url.pathname})`)
    switch (url.pathname) {
      case '/bluetooth_broadcast':
        a2dp.open(bluetooth.A2DP_MODE_SNK)
        break
      case '/bluetooth_start_bluetooth_music':
        if (!a2dp.isOpened() || a2dp.getMode() !== bluetooth.A2DP_MODE_SNK) {
          a2dp.open(bluetooth.A2DP_MODE_SNK, {autoplay: true})
        } else if (!a2dp.isConnected()) {
          speak(textTable['STRING_OPEN_BEGIN'] + myDeviceName + textTable['STRING_CONNECT_MOBILE_END'])
        } else if (!a2dp.isPlaying()) {
          a2dp.start()
        }
        break
    }
  })

  activity.on('appcmd', function (intent, data) {
    logger.info(`activity.onAppCmd(${intent}, ${JSON.stringify(data)})`)
    switch (intent) {
      case 'bluetooth_status':
        var status = 'closed'
        if (a2dp.getMode() === bluetooth.A2DP_MODE_SRC && a2dp.isOpened()) {
          status = 'opened'
        }
        var template = null
        if (status === 'opened' && a2dp.isConnected()) {
          template = {'currentDevice': a2dp.getConnectedDevice()}
        }
        sendMsgToApp(status, template)
        break
      case 'bluetooth_broadcast':
        a2dp.open(bluetooth.A2DP_MODE_SRC)
        break
      case 'bluetooth_disconnect':
        a2dp.close()
        break
      case 'connect_devices':
        var targetAddr = data.deviceAddress.value
        var targetName = data.deviceName.value
        a2dp.connect(targetAddr, targetName)
        break
      case 'disconnect_devices':
        a2dp.disconnect()
        break
      case 'bluetooth_discovery':
        a2dp.discovery()
        break
      default:
        logger.warn('Received unknow app cmd!')
        break
    }
  })
}
