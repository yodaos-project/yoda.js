'use strict'

var childProcess = require('child_process')
var fs = require('fs')
var promisify = require('util').promisify
var ActivationConfig = require('@yoda/env')().activation
var BaseConfig = require('./base-config')
var Caps = require('@yoda/caps/caps.node').Caps
var property = require('@yoda/property')
var safeParse = require('@yoda/util').json.safeParse
var logger = require('logger')('custom-config-wakeup')
var flora = require('./singleton-flora')

// var AWAKE_EFFECT_DEFAULT = '0'
var AWAKE_EFFECT_CUSTOM = '1'
var AWAKE_EFFECT = 'rokid.custom_config.wakeup_sound'

var WAKE_SOUND_OPEN = '已为你开启'
var WAKE_SOUND_CLOSE = '已关闭'
var CONFIG_FAILED = '设置失败'
var SWITCH_OPEN = 'open'
var SWITCH_CLOSE = 'close'

var readDirAsync = promisify(fs.readdir)
var unlinkAsync = promisify(fs.unlink)
var downloadAsync = promisify(doDownloadFile)

/**
 * download file use `wget`
 * @param {string} url
 * @param {string} dest
 * @param {object} options - options.noCheckCertificate / options.continue
 * @param {Function} callback
 */
function doDownloadFile (url, dest, options, callback) {
  var args = []
  if (options && options.noCheckCertificate) {
    args = args.concat('--no-check-certificate')
  }
  if (options && options.continue) {
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
      callback(null, dest)
      return
    }
    var err = new Error(`Failed on download file[${url}] for exit code ${code} and signal ${signal}`)
    err.code = code
    err.signal = signal
    callback(err)
  }) /** cp.on('exit') */
}

/**
 * remove files in path
 * @param path - dest path
 * @returns {Promise}
 */
function clearDir (path) {
  return readDirAsync(path).then((files) => {
    if (!files) {
      return Promise.resolve(true)
    }
    var promises = []
    for (var i = 0; i < files.length; ++i) {
      promises.push(unlinkAsync(path + files[i]))
    }
    return Promise.all(promises).catch((error) => {
      logger.warn(`clear dir error: ${error}`)
    })
  })
}

/**
 * Download wav files
 * @param wakeupSoundEffects - array of query value
 * @param path - download path
 * @returns {Promise}
 */
function downloadWav (wakeupSoundEffects, path) {
  var promises = []
  for (var i = 0; i < wakeupSoundEffects.length; ++i) {
    if (wakeupSoundEffects[i].hasOwnProperty('wakeupUrl') && wakeupSoundEffects[i].hasOwnProperty('wakeupId')) {
      logger.info(`download ${wakeupSoundEffects[i].wakeupUrl} to '${path}'`)
      promises.push(downloadAsync(wakeupSoundEffects[i].wakeupUrl,
        `${path}${wakeupSoundEffects[i].wakeupId}.wav`, null))
    }
  }
  return Promise.all(promises)
}

/**
 * Wakeup effect processor
 */
class WakeupEffect extends BaseConfig {
  constructor (activity) {
    super(activity)
    if (!ActivationConfig) {
      logger.warn(`Activation config is null`)
      ActivationConfig = {}
    }
    if (!ActivationConfig.hasOwnProperty('customPath')) {
      ActivationConfig.customPath = '/data/activation/media/'
    } else {
      if (!ActivationConfig.customPath[ActivationConfig.customPath.length - 1] === '/') {
        ActivationConfig.customPath += '/'
      }
    }
    if (!ActivationConfig.hasOwnProperty('defaultPath')) {
      ActivationConfig.defaultPath = '/opt/media/activation/'
    } else {
      if (!ActivationConfig.defaultPath[ActivationConfig.defaultPath.length - 1] === '/') {
        ActivationConfig.defaultPath += '/'
      }
    }
    this.init()
  }

  /**
   * Get the intent -> function map for current processor
   * @returns {object}
   */
  getIntentMap () {
    return {
      awakeswitch: this.onWakeupEffectStatusChangedFromIntent.bind(this),
      wakeup: this.onWakeupEffectStatusChangedFromIntent.bind(this)
    }
  }

  /**
   * Get the url -> function map for current processor
   * @returns {object}
   */
  getUrlMap () {
    return {
      wakeupSoundEffects: this.onWakeupEffectStatusChangedFromUrl.bind(this),
      wakeup: this.onWakeupEffectStatusChangedFromUrl.bind(this)
    }
  }

  /**
   * notify activation service to reload config
   * @param {array} fileNameList - file name list
   */
  notifyActivation (fileNameList) {
    var caps = new Caps()
    caps.writeInt32(fileNameList.length)
    fileNameList.forEach(function (f) {
      caps.writeString(f)
    })
    this.floraAgent.post(AWAKE_EFFECT, caps, flora.MSGTYPE_PERSIST)
  }

  /**
   * get all wakeup sound file name
   * @returns {array} array of file name
   */
  getFileList () {
    var awakeSound = property.get('sys.wakeupsound', 'persist')
    var path = awakeSound === AWAKE_EFFECT_CUSTOM ? ActivationConfig.customPath : ActivationConfig.defaultPath
    return readDirAsync(path).then((files) => {
      for (var i = 0; i < files.length; ++i) {
        files[i] = path + files[i]
      }
      return files
    })
  }
  /**
   * process request from intent
   * only default wakeup effect for now
   * @param {string} action - 'open'/'close'
   */
  onWakeupEffectStatusChangedFromIntent (action) {
    property.set('sys.wakeupwitch', action, 'persist')
    if (action === 'close') {
      this.notifyActivation([])
    } else {
      this.getFileList().then((fileList) => {
        if (!fileList || !(fileList instanceof Array)) {
          fileList = []
        }
        this.notifyActivation(fileList)
      })
    }
  }

  /**
   * init the activation status
   */
  init () {
    var action = property.get('sys.wakeupwitch', 'persist')
    if (action === SWITCH_CLOSE) {
      this.notifyActivation([])
    } else {
      this.getFileList().then((fileList) => {
        this.notifyActivation(fileList)
      })
    }
  }
  /**
   * process request from url
   * @param {string} queryObj - object from url,
   */
  onWakeupEffectStatusChangedFromUrl (queryObj) {
    var realQueryObj = safeParse(queryObj.param)
    this.applyWakeupEffect(realQueryObj, queryObj.isFirstLoad)
  }

  /**
   * apply changes
   * @param queryObj - query object
   * @param isFirstLoad -
   */
  applyWakeupEffect (queryObj, isFirstLoad) {
    if (queryObj && queryObj.action) {
      property.set('sys.wakeupswitch', queryObj.action, 'persist')
      if (queryObj.type !== undefined) {
        property.set('sys.wakeupsound', queryObj.type, 'persist')
      }
      if (queryObj.action === SWITCH_CLOSE) {
        this.notifyActivation([])
      } else {
        if (queryObj.type && queryObj.type === AWAKE_EFFECT_CUSTOM) {
          if (typeof queryObj.wakeupSoundEffects !== 'object') {
            return
          }
          clearDir(ActivationConfig.customPath).then(() => {
            downloadWav(queryObj.wakeupSoundEffects, ActivationConfig.customPath).then((fileList) => {
              this.notifyActivation(fileList)
            }).catch((err) => {
              logger.warn(`download custom wakeup sound error: ${err}`)
            })
          })
        } else {
          this.getFileList().then((fileList) => {
            this.notifyActivation(fileList)
          })
        }
      }

      if (!isFirstLoad) {
        if (queryObj.action === SWITCH_OPEN) {
          this.activity.tts.speak(WAKE_SOUND_OPEN).then(() => this.activity.exit())
        } else if (queryObj.action === SWITCH_CLOSE) {
          this.activity.tts.speak(WAKE_SOUND_CLOSE).then(() => this.activity.exit())
        } else {
          this.activity.tts.speak(CONFIG_FAILED).then(() => this.activity.exit())
        }
      }
    }
  }
}

module.exports = WakeupEffect
