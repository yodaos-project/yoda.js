var _ = require('@yoda/util')._
var safeParse = require('@yoda/util').json.safeParse
var logger = require('logger')('custom-config')
var Url = require('url')
var property = require('@yoda/property')
var CloudGW = require('@yoda/cloudgw')
var ActivationConfig = require('/etc/yoda/env.json')
var cloudgw = null
var fs = require('fs')

var AWAKE_EFFECT = 'rokid.custom_config.awake_effect'
/**
 *
 * @private
 * @param {string} url
 * @param {string} dest
 * @param {object} options - options.noCheckCertificate / options.continue
 * @param {Function} callback
 */
function doDownloadFile (url, dest, options, callback) {
  var args = []
  if (options.noCheckCertificate) {
    args = args.concat('--no-check-certificate')
  }
  if (options.continue) {
    args = args.concat('-c')
  }
  args = args.concat('-O', dest, url)
  var cp = childProcess.spawn('wget', args)

  var returned = false
  cp.on('error', function onChildProcessError (err) {
    if (returned) {
      return
    }
    returned = true
    callback(err)
  }) /** cp.on('error') */
  cp.on('exit', function onChildProcessExit (code, signal) {
    if (returned) {
      return
    }
    if (code === 0) {
      callback(null)
      return
    }
    var err = new Error(`Failed on download ota image for exit code ${code} and signal ${signal}`)
    err.code = code
    err.signal = signal
    callback(err)
  }) /** cp.on('exit') */
}

module.exports = function customConfig (activity) {
  var CONFIG_FAILED = '设置失败'
  var LIGHT_SWITCH_OPEN = '灯光已开启'
  var LIGHT_SWITCH_CLOSE = '灯光已关闭'
  var WAKE_SOUND_OPEN = '已为你开启'
  var WAKE_SOUND_CLOSE = '已关闭'
  var PICKUP_SWITCH_OPEN = '当前不支持连续对话'
  var PICKUP_SWITCH_CLOSE = '当前不支持连续对话'
  // var KEY_WAKE_SOUND_SWITCH = 'wakeupSoundEffects'
  // var KEY_THEME_LIGHT_SWITCH = 'standbyLight'
  // var KEY_KEEP_CONFIRM_SWITCH = 'continuousDialog'
  // var KEY_NIGHT_MODE_SWITCH = 'nightMode'
  // var KEY_VT_WORDS = 'vt_words'
  var INTENT_WAKE_SOUND_SWITCH = 'awakeswitch'
  var INTENT_THEME_LIGHT_SWITCH = 'lightswitch'
  var INTENT_KEEP_CONFIRM_SWITCH = 'pickupswitch'
  var SWITCH_OPEN = 'open'
  var SWITCH_CLOSE = 'close'
  var SWITCH_VT_UPDATE = 'update'
  var SWITCH_VT_ADD = 'add'
  var SWITCH_VT_DELETE = 'delete'
  var VT_WORDS_TOPIC = 'custom_config'
  var STANDBY_LIGHT_JS = 'system://setSysStandby.js'
  this.startTime = null
  this.endTime = null
  this.inNightMode = false
  this.nextDeltaTime = null
  this.deltaTime = null
  this.waitForCloseTimer = null
  this.waitForNextTimer = null
  this.oldTxt = null
  this.py = null
  this.txt = null

  initStandbyLight()
  activity.on('request', (nlp, action) => {
    var intent = nlp.intent
    var actionValue = _.get(nlp, 'slots.open.type') || _.get(nlp, 'slots.close.type')
    logger.info('request---->intent:' + intent + ';   action: ' + actionValue)
    if (intent === INTENT_KEEP_CONFIRM_SWITCH) {
      onPickupSwitchStatusChanged(actionValue, false)
    } else if (intent === INTENT_THEME_LIGHT_SWITCH) {
      onStandbyLightSwitchStatusChanged(actionValue, false)
    } else if (intent === INTENT_WAKE_SOUND_SWITCH) {
      onWakeupEffectStatusChanged(actionValue, false)
    }
  })

  activity.on('ready', () => {
    activity.get().then(config => {
      cloudgw = new CloudGW(config)
    })
  })

  activity.on('url', (url) => {
    logger.info('on Url---->is called: ')
    var urlObj = Url.parse(url)
    var queryObj = urlObj.query
    if (typeof queryObj === 'object') {
      logger.info('on Url----> query is object')
    } else if (typeof queryObj === 'string') {
      logger.info('on Url----> query is string:  ' + queryObj)
    }
    var action = queryObj.action
    logger.info('the isFirstLoad is' + queryObj.isFirstLoad)
    var isFirstLoad
    logger.info('on Url----> query typeof queryObj.isFirstLoad:  ', typeof queryObj.isFirstLoad)
    if (queryObj.isFirstLoad === 'false' || queryObj.isFirstLoad === false) {
      isFirstLoad = false
    } else if (queryObj.isFirstLoad === 'true' || queryObj.isFirstLoad === true) {
      isFirstLoad = true
    }

    logger.info('on Url----> action: ' + action + '; urlObj.pathname: ' + urlObj.pathname + ';   isFirstLoad: ' + isFirstLoad)
    if (urlObj.pathname === '/nightMode') {
      this.startTime = queryObj.startTime
      this.endTime = queryObj.endTime
      nightMode(action)
    } else if (urlObj.pathname === '/vt_words') {
      this.oldTxt = queryObj.oldTxt
      this.txt = queryObj.txt
      this.py = queryObj.py
      onVtWordSwitchStatusChanged(action, false)
    } else if (urlObj.pathname === '/continuousDialog') {
      onPickupSwitchStatusChanged(action, isFirstLoad)
    } else if (urlObj.pathname === '/wakeupSoundEffects') {
      onWakeupEffectStatusChanged(action, isFirstLoad)
    } else if (urlObj.pathname === '/standbyLight') {
      onStandbyLightSwitchStatusChanged(action, isFirstLoad)
    } else if (urlObj.pathname === '/firstLoad') {
      var config = queryObj.config
      onLoadCustomConfig(config)
    }
  })
  function initStandbyLight () {
    var switchValue = property.get('persist.sys.standbylightswitch')
    if (switchValue === SWITCH_OPEN) {
      activity.light.play(STANDBY_LIGHT_JS, {}, {shouldResume: true})
    } else {
      activity.light.stop(STANDBY_LIGHT_JS)
    }
  }

  function onVtWordSwitchStatusChanged (action, isFirstLoad) {
    if (action && !isFirstLoad) {
      if (action === SWITCH_VT_UPDATE) {
        activity.turen.deleteVtWord(this.oldTxt)
        activity.turen.addVtWord(this.txt, this.py)
        sendAddUpdateStatusToServer(action)
        sendSuccessStatusToApp(action, true)
      } else if (action === SWITCH_VT_ADD) {
        activity.turen.addVtWord(this.txt, this.py)
        sendAddUpdateStatusToServer(action)
        sendSuccessStatusToApp(action, true)
      } else if (action === SWITCH_VT_DELETE) {
        activity.turen.deleteVtWord(this.txt)
        sendDeleteStatusToServer(action)
        sendSuccessStatusToApp(action, true)
      }
      activity.exit()
    }
  }

  function onVtWordSwitchFirstChanged (action, isFirstLoad) {
    if (action && !isFirstLoad) {
      if (action === SWITCH_VT_UPDATE) {
        activity.turen.deleteVtWord(this.oldTxt)
        activity.turen.addVtWord(this.txt, this.py)
      } else if (action === SWITCH_VT_ADD) {
        activity.turen.addVtWord(this.txt, this.py)
      } else if (action === SWITCH_VT_DELETE) {
        activity.turen.deleteVtWord(this.txt)
      }
      activity.exit()
    }
  }

  function sendAddUpdateStatusToServer (action) {
    var sendVtObj = {
      vt_words: JSON.stringify([{
        py: this.py,
        txt: this.txt,
        oldTxt: this.oldTxt,
        action: action,
        phoneme: ''
      }])
    }
    cloudgw.request('/v1/device/deviceManager/addOrUpdateDeviceInfo',
      { namespace: 'custom_config', values: sendVtObj })
  }

  function sendDeleteStatusToServer (action) {
    var sendVtObj = {
      vt_words: JSON.stringify([{
        py: this.py,
        txt: '',
        oldTxt: this.oldTxt,
        action: '',
        phoneme: ''
      }])
    }
    cloudgw.request('/v1/device/deviceManager/addOrUpdateDeviceInfo',
      { namespace: 'custom_config', values: sendVtObj })
  }

  function sendSuccessStatusToApp (action, setStatus) {
    var sendObj = {
      vt_words: JSON.stringify([{
        py: this.py,
        oldTxt: this.oldTxt,
        txt: this.txt,
        action: action,
        success: setStatus
      }])
    }
    activity.wormhole.sendToApp(VT_WORDS_TOPIC, sendObj)
  }

  function onPickupSwitchStatusChanged (action, isFirstLoad) {
    if (action) {
      property.set('sys.pickupswitch', action, 'persist')
      if (!isFirstLoad) {
        if (action === SWITCH_OPEN) {
          activity.tts.speak(PICKUP_SWITCH_OPEN).then(() => activity.exit())
        } else if (action === SWITCH_CLOSE) {
          activity.tts.speak(PICKUP_SWITCH_CLOSE).then(() => activity.exit())
        } else {
          activity.tts.speak(CONFIG_FAILED).then(() => activity.exit())
        }
      }
    }
  }

  function onStandbyLightSwitchStatusChanged (action, isFirstLoad) {
    if (action) {
      property.set('sys.standbylightswitch', action, 'persist')
      if (action === SWITCH_OPEN) {
        activity.light.play(STANDBY_LIGHT_JS, {}, {shouldResume: true})
      } else if (action === SWITCH_CLOSE) {
        activity.light.stop(STANDBY_LIGHT_JS)
      }
      if (!isFirstLoad) {
        if (action === SWITCH_OPEN) {
          activity.tts.speak(LIGHT_SWITCH_OPEN).then(() => activity.exit())
        } else if (action === SWITCH_CLOSE) {
          activity.tts.speak(LIGHT_SWITCH_CLOSE).then(() => activity.exit())
        } else {
          activity.tts.speak(CONFIG_FAILED).then(() => activity.exit())
        }
      }
    }
  }

  function clearCustomWakeupDir () {
    fs.readdir(ActivationConfig.customPath,function(err,files){
      if(!files)
        return;
      files.forEach(function(ele){
        fs.stat(path+"/"+ele,function(err,info){
          if(info.isDirectory()){
            console.log("dir: "+ele)
            readDir(path+"/"+ele);
          }else{
            console.log("file: "+ele)
          }
        })
      })
    })
  }
  function onWakeupEffectStatusChanged (queryObj, isFirstLoad) {
    if (queryObj && queryObj.action) {
      if (!queryObj.type || queryObj.type === AWAKE_EFFECT_DEFAULT) {
        property.set('sys.awakeswitch', queryObj.action, 'persist')
      } else if (queryObj.type === AWAKE_EFFECT_CUSTOM) {
        property.set('sys.customawakeswitch', queryObj.action, 'persist')
        if (typeof queryObj.value !== 'object')
          return
        var downloadCount = queryObj.value.length
        var errCount = 0
        for (var i = 0; i < queryObj.value.length; ++i) {
          if (queryObj.value[i].wakeupUrl && queryObj.value[i].wakeupId) {
            doDownloadFile(queryObj.value[i].wakeupUrl, `${ActivationConfig.customPath}${queryObj.value[i].wakeupId}.wav`,
              null, (err) => {
                downloadCount--
                if (err) {
                  logger.warn(`download awake effect error: ${err}`)
                  errCount++
                }
                if (downloadCount === 0) {
                  // todo flora post, delete old wav file
                  var caps = new Caps()
                  caps.writeInt32(0)
                  floraAgent.post(AWAKE_EFFECT, caps, floraAgent.MSGTYPE_INSTANT)
                }
              })
          }
        }
      }
      if (!isFirstLoad) {
        if (queryObj.action === SWITCH_OPEN) {
          activity.tts.speak(WAKE_SOUND_OPEN).then(() => activity.exit())
        } else if (queryObj.action === SWITCH_CLOSE) {
          activity.tts.speak(WAKE_SOUND_CLOSE).then(() => activity.exit())
        } else {
          activity.tts.speak(CONFIG_FAILED).then(() => activity.exit())
        }
      }
    }
  }

  function nightMode (action) {
    logger.info('nightMode---->: ' + action)
    if (action === 'open') {
      refreshNightMode(true)
    } else if (action === 'close') {
      clearTimeout(this.waitForCloseTimer)
      clearTimeout(this.waitForNextTimer)
      setNightMode(false)
    }
    return Promise.resolve()
  }

  function checkTime () {
    var curDate = new Date()
    var curHour = curDate.getHours()
    var curMinute = curDate.getMinutes()
    var start = this.startTime.split(':')
    var end = this.endTime.split(':')
    if (start.length !== 2 || end.length !== 2) {
      return false
    }
    var startHour = Number(start[0])
    var startMinute = Number(start[1])
    var endHour = Number(end[0])
    var endMinute = Number(end[1])
    logger.info('checkTime---->curTime: ' + curHour + ':' + curMinute)
    logger.info('checkTime---->startTime: ' + this.startTime)
    logger.info('checkTime---->endTime: ' + this.endTime)
    if (startHour > endHour ||
      (startHour === endHour && startMinute > endMinute)) {
      if ((curHour > startHour) ||
        (curHour === startHour && curMinute >= startMinute) ||
        (curHour < endHour) ||
        (curHour === endHour && curMinute <= endMinute)) {
        logger.info('checkTime---->:in diff day and in nightmode time range ')
        if (curHour >= endHour) {
          this.deltaTime = ((endHour + 24 - curHour) * 60 * 60 * 1000 + (endMinute - curMinute + 1) * 60 * 1000)
        } else {
          this.deltaTime = ((endHour - curHour) * 60 * 60 * 1000 + (endMinute - curMinute + 1) * 60 * 1000)
        }
        logger.info('checkTime,in diff day and in nightmode time range  && closeDeltaTime is : ' + this.deltaTime)
        return true
      } else {
        this.nextDeltaTime = ((startHour - curHour) * 60 * 60 * 1000 + (startMinute - curMinute + 1) * 60 * 1000)
        logger.info('checkTime,in diff day and not in nightmode time range  && nextDeltaTime is : ' + this.nextDeltaTime)
      }
    } else {
      if ((curHour > startHour || (curHour === startHour && curMinute >= startMinute)) &&
      ((curHour < endHour) || (curHour === endHour && curMinute <= endMinute))) {
        logger.info('checkTime---->:in same day and in nightmode time range ')
        this.deltaTime = ((endHour - curHour) * 60 * 60 * 1000 + (endMinute - curMinute + 1) * 60 * 1000)
        logger.info('checkTime,in same day and in nightmode time range  && closeDeltaTime is : ' + this.deltaTime)
        return true
      } else {
        if (curHour >= endHour) {
          this.nextDeltaTime = ((startHour + 24 - curHour) * 60 * 60 * 1000 + (startMinute - curMinute + 1) * 60 * 1000)
        } else {
          this.nextDeltaTime = ((startHour - curHour) * 60 * 60 * 1000 + (startMinute - curMinute + 1) * 60 * 1000)
        }
        logger.info('checkTime, in same day and not in nightmode time range  && nextDeltaTime is : ' + this.nextDeltaTime)
      }
    }
    return false
  }

  function refreshNightMode (isForce) {
    logger.info('refreshNightMode---->isForce: ' + isForce)
    if (checkTime()) {
      setNightMode(true)
      waitForCloseNightMode()
    } else {
      setNightMode(false)
      waitForNextNightMode()
    }
  }

  function setNightMode (isOpen) {
    property.set('sys.nightmode.status', isOpen ? 'open' : 'close', 'persist')
    if (isOpen) {
      this.inNightMode = true
    } else {
      this.inNightMode = false
    }
  }

  function waitForCloseNightMode () {
    logger.info('waitForCloseNightMode---->deltaTime: ' + this.deltaTime)
    this.waitForCloseTimer = setTimeout(() => {
      refreshNightMode(false)
    }, this.deltaTime)
  }

  function waitForNextNightMode () {
    logger.info('waitForNextNightMode---->nextDeltaTime: ' + this.nextDeltaTime)
    this.waitForNextTimer = setTimeout(() => {
      refreshNightMode(true)
    }, this.nextDeltaTime)
  }

  function onLoadCustomConfig (config) {
    if (config === undefined) {
      return
    }
    logger.info(' onLoadCustomConfig----> config:  ', config)
    var customConfig = safeParse(config)
    if (_.get(customConfig, 'vt_words')) {
      var vtwordsText = customConfig.vt_words
      var vrwordsObj = safeParse(vtwordsText)
      if (vrwordsObj) {
        this.oldTxt = vrwordsObj[0].oldTxt
        this.txt = vrwordsObj[0].txt
        this.py = vrwordsObj[0].py
        onVtWordSwitchFirstChanged(vrwordsObj[0].action, false)
      }
    }
    if (_.get(customConfig, 'continuousDialog')) {
      var continuousDialogObj = customConfig.continuousDialog
      var continueObj = safeParse(continuousDialogObj)
      if (continueObj) {
        logger.info('continuousDialogObj.action:  ', continueObj.action)
        onPickupSwitchStatusChanged(continueObj.action, true)
      }
    }
    if (_.get(customConfig, 'standbyLight')) {
      var standbyLightText = customConfig.standbyLight
      var standbyLightObj = safeParse(standbyLightText)
      if (standbyLightObj) {
        logger.info('standbyLight.action:  ', standbyLightObj.action)
        onStandbyLightSwitchStatusChanged(standbyLightObj.action, true)
      }
    }
    if (_.get(customConfig, 'wakeupSoundEffects')) {
      var wakeupSoundEffectsText = customConfig.wakeupSoundEffects
      var wakeupSoundEffectsObj = safeParse(wakeupSoundEffectsText)
      if (wakeupSoundEffectsObj) {
        logger.info('wakeupSoundEffects.action:  ', wakeupSoundEffectsObj.action)
        onWakeupEffectStatusChanged(wakeupSoundEffectsObj.action, true)
      }
    }
    if (_.get(customConfig, 'nightMode')) {
      var nightModeText = customConfig.nightMode
      var nightModeObj = safeParse(nightModeText)
      if (nightModeObj) {
        logger.info(' nightMode:  ', nightModeObj)
        this.startTime = nightModeObj.startTime
        this.endTime = nightModeObj.endTime
        nightMode(nightModeObj.action)
      }
    }
  }
}
