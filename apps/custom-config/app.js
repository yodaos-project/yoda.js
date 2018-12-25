var _ = require('@yoda/util')._
var safeParse = require('@yoda/util').json.safeParse
var logger = require('logger')('custom-config')
var Url = require('url')
var property = require('@yoda/property')
var CloudGW = require('@yoda/cloudgw')
var ActivationConfig = require('/etc/yoda/env.json')
var fs = require('fs')
var promisify = require('util').promisify
var childProcess = require('child_process')
var flora = require('@yoda/flora')

var readDirAsync = promisify(fs.readdir)
var unlinkAsync = promisify(fs.unlink)
var downloadAsync = promisify(doDownloadFile)
var cloudgw = null

var AWAKE_EFFECT_DEFAULT = 0
var AWAKE_EFFECT_CUSTOM = 1
var AWAKE_EFFECT = 'rokid.custom_config.awake_effect'

var uri = 'unix:/var/run/flora.sock'
var floraAgent
floraAgent = new flora.Agent(`${uri}#custom_config`)
floraAgent.start()

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
    var err = new Error(`Failed on download file[${url}] for exit code ${code} and signal ${signal}`)
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
    if (urlObj.pathname === '/vt_words') {
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

  function clearDir (path) {
    return readDirAsync(path).then((files) => {
      if (!files) {
        return true
      }
      var promises = []
      for (var i = 0; i < files.length; ++i) {
        promises.push(unlinkAsync(path + files[i]))
      }
      return Promise.all(promises).catch((_) => true)
    })
  }
  function downloadWav (queryValues, path) {
    var promises = []
    for (var i = 0; i < queryValues.length; ++i) {
      if (queryValues[i].wakeupUrl && queryValues[i].wakeupId) {
        promises.push(downloadAsync(queryValues[i].wakeupUrl,
          `${path}${queryValues[i].wakeupId}.wav`, null))
      }
    }
    return Promise.all(promises)
  }

  function onWakeupEffectStatusChanged (queryObj, isFirstLoad) {
    if (queryObj && queryObj.action) {
      if (!queryObj.type || queryObj.type === AWAKE_EFFECT_DEFAULT) {
        property.set('sys.awakeswitch', queryObj.action, 'persist')
      } else if (queryObj.type === AWAKE_EFFECT_CUSTOM) {
        property.set('sys.customawakeswitch', queryObj.action, 'persist')
        if (typeof queryObj.value !== 'object') {
          return
        }
        clearDir(ActivationConfig.customPath).then(() => {
          downloadWav(queryObj.value, ActivationConfig.customPath).then(() => {
            floraAgent.post(AWAKE_EFFECT, [0], floraAgent.MSGTYPE_INSTANT)
          }).catch((err) => {
            logger.warn(`download custom awake effect error: ${err}`)
          })
        })
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
  }
}
