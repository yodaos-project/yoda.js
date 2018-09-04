'use strict'

/**
 * @namespace yodaRT
 */

var fs = require('fs')
var dbus = require('dbus')
var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var perf = require('./performance')
var dbusConfig = require('../dbus-config.json')
var DbusRemoteCall = require('./dbus-remote-call')
var _ = require('@yoda/util')._

var Permission = require('./component/permission')
var AppExecutor = require('./app/executor')
var env = require('./env')()
var logger = require('logger')('yoda')
var ota = require('@yoda/ota')
var Input = require('@yoda/input')

module.exports = AppRuntime
perf.stub('init')

/**
 * @memberof yodaRT
 * @constructor
 * @param {Array} paths - the pathname
 */
function AppRuntime (paths) {
  EventEmitter.call(this)
  // App Executor
  this.apps = {}
  this.config = {
    host: env.cloudgw.wss,
    port: 443,
    deviceId: null,
    deviceTypeId: null,
    key: null,
    secret: null
  }

  // 保存正在运行的AppID
  this.appIdStack = []
  this.bgAppIdStack = []
  this.cloudAppIdStack = []
  // 保存正在运行的App Map, 以AppID为key
  this.appMap = {}
  // 保存正在运行的App的data, 以AppID为key
  this.appDataMap = {}
  // save the skill's id domain
  this.domain = {
    cut: '',
    scene: ''
  }
  // manager app's permission
  this.permission = new Permission(this)

  this.loadAppComplete = false
  // 加载APP
  this.loadApp(paths, () => {
    this.loadAppComplete = true
    logger.log('load app complete')
    this.startDaemonApps()
  })
  // volume module
  this.volume = null
  this.prevVolume = -1
  this.handle = {}

  this.cloudApi = null
  // to identify the first start
  this.online = undefined
  this.login = undefined
  this.micMuted = false

  this.forceUpdateAvailable = false

  // 启动extapp dbus接口
  this.startExtappService()
  // 处理mqtt事件
  this.handleMqttMessage()
  // handle keyboard/button events
  this._input = Input()
  this.listenKeyboardEvents()

  this.dbusSignalRegistry = new EventEmitter()
  this.listenDbusSignals()
}
inherits(AppRuntime, EventEmitter)

/**
 * 根据应用包安装目录加载所有应用
 * @param {String[]} paths 应用包的安装目录
 * @param {Function} cb 加载完成的回调，回调没有参数
 * @private
 */
AppRuntime.prototype.loadApp = function (paths, cb) {
  var self = this

  // 根据目录读取目录下所有的App包，返回的是App的包路径
  var loadAppDir = function (dirs, next) {
    // 检查参数
    if (dirs.length <= 0) {
      next([])
      return
    }
    // 保存所有的App目录
    var appRoot = []
    // 读取文件夹，递归调用，不读取子目录
    var readDir = function (index) {
      fs.readdir(dirs[index], function (err, files) {
        if (err) {
          logger.log('read dir error: ', dirs[index])
        } else {
          files.map(function (name) {
            if (name === '.' || name === '..') {
              return
            }
            appRoot.push(dirs[index] + '/' + name)
          })
        }
        index++
        if (index < paths.length) {
          readDir(index)
        } else {
          // 读取完成回调
          next(appRoot)
        }
      })
    }
    readDir(0)
  }
  // 读取目录并加载APP
  loadAppDir(paths, function (apps) {
    // 检查目录下是否有App包
    if (apps.length <= 0) {
      logger.log('no app load')
      cb()
      return
    }
    logger.log('load app num: ', apps.length)
    // 加载APP
    var loadApp = function (index) {
      self.load(apps[index], function (err, metadata) {
        if (err) {
          // logger.log('load app error: ', err);
        }
        index++
        if (index < apps.length) {
          loadApp(index)
        } else {
          // 加载完成回调
          cb()
        }
      })
    }
    loadApp(0)
  })
}

/**
 * 根据应用的包路径加载应用
 * @param {string} root 应用的包路径
 * @param {string} name 应用的包名字
 * @param {function} cb 加载完成的回调: (err, metadata)
 * @return {object} 应用的appMetaData
 * @private
 */
AppRuntime.prototype.load = function (root, cb) {
  var prefix = root
  var pkgInfo
  var app
  logger.log('load app: ' + root)
  fs.readFile(prefix + '/package.json', 'utf8', (err, data) => {
    if (err) {
      cb(err)
    } else {
      pkgInfo = JSON.parse(data)
      if (pkgInfo.metadata && pkgInfo.metadata.skills) {
        for (var i in pkgInfo.metadata.skills) {
          var id = pkgInfo.metadata.skills[i]
          // 加载权限配置
          this.permission.load(id, pkgInfo.metadata.permission || [])
          if (this.apps[id]) {
            // 打印调试信息
            logger.log('load app path: ', prefix)
            logger.log('skill id: ', id)
            throw new Error('skill conflicts')
          }
          app = new AppExecutor(pkgInfo, prefix)
          if (app.valid) {
            app.skills = pkgInfo.metadata.skills
            this.apps[id] = app
          } else {
            cb(app.errmsg)
            return
          }
        }
        cb(null, {
          pathname: prefix,
          metadata: pkgInfo.metadata
        })
      } else {
        cb(new Error('invalid app format: ' + root))
      }
    }
  })
}

AppRuntime.prototype.startDaemonApps = function startDaemonApps () {
  Object.keys(this.apps).forEach(appId => {
    var executor = this.apps[appId]
    if (!executor.daemon) {
      return
    }
    logger.info('Starting daemon app', appId)
    return executor.create(appId, this)
  })
}

/**
 * 接收turen的speech事件
 * @param {string} name
 * @param {object} data
 * @private
 */
AppRuntime.prototype.onEvent = function (name, data) {
  var min = 30
  var volume = this.volume.getVolume()
  if (name === 'voice coming') {
    if (this.online !== true) {
      // Do noting when there is no network
      return
    }
    if (volume > min) {
      this.prevVolume = volume
      this.volume.setVolume(min)
      this.handle.setVolume = setTimeout(() => {
        this.volume.setVolume(volume)
        this.prevVolume = -1
      }, process.env.APP_KEEPALIVE_TIMEOUT || 6000)
    }
    this.lightMethod('setAwake', [''])
    if (this.forceUpdateAvailable) {
      logger.info('pending force update, delegates activity to @ota.')
      this.forceUpdateAvailable = false
      ota.getInfoOfPendingUpgrade((err, info) => {
        if (err || info == null) {
          logger.error('failed to fetch pending update info, skip force updates', err && err.stack)
          return
        }
        logger.info('got pending update info', info)
        this.startApp('@ota', { intent: 'force_upgrade', _info: info }, {})
      })
    }
  } else if (name === 'voice local awake') {
    if (this.online !== true) {
      // start @network app
      this.startApp('@network', {}, {})
      // Do noting when there is no network
      return
    }
    this.lightMethod('setDegree', ['', '' + (data.sl || 0)])
  } else if (name === 'asr pending') {

  } else if (name === 'asr end') {
    this.lightMethod('setLoading', [''])
  } else if (name === 'nlp') {
    clearTimeout(this.handle.setVolume)
    if (this.prevVolume > 0) {
      this.volume.setVolume(this.prevVolume)
      this.prevVolume = -1
    }
    this.lightMethod('setHide', [''])
    this.onVoiceCommand(data.asr, data.nlp, data.action)
  } else if (name === 'connected') {
    // waiting for the app load complete
    if (this.loadAppComplete === false) {
      return
    }
    if (this.online === false || this.online === undefined) {
      // need to play startup music
      logger.log('first startup')
      this.onReconnected()
      this.emit('reconnected')

      /** Announce last installed ota changelog and clean up ota files */
      ota.getInfoIfFirstUpgradedBoot((err, info) => {
        if (err || info == null) {
          logger.error('failed to fetch upgraded info, skipping', err && err.stack)
          return
        }
        this.startApp('@ota', { intent: 'on_first_boot_after_upgrade', _info: info }, {})
      })
    }
    this.online = true
  } else if (name === 'disconnected') {
    // waiting for the app load complete
    if (this.loadAppComplete === false) {
      return
    }
    // trigger disconnected event when network state is switched or when it is first activated.
    if (this.online === true || this.online === undefined) {
      // start network app here
      this.onDisconnected()
      this.emit('disconnected')
    }
    this.online = false
  }
}

/**
 * 解析服务端返回的NLP，并执行App生命周期
 * @private
 * @param {string} asr 语音识别后的文字
 * @param {object} nlp 服务端返回的NLP
 * @param {object} action 服务端返回的action
 * @param {object} [options]
 * @param {boolean} [options.preemptive]
 */
AppRuntime.prototype.onVoiceCommand = function (asr, nlp, action, options) {
  var appInfo = {}
  var appId
  try {
    // for appDataMap
    appId = nlp.cloud === true ? '@cloud' : nlp.appId
    appInfo = {
      appId: nlp.appId,
      cloud: nlp.cloud,
      form: appId === '@cloud' ? 'scene' : action.response.action.form
    }
  } catch (error) {
    logger.log('invalid nlp/action, ignore')
    return
  }
  return this.createOrResumeApp(appId, Object.assign({}, options, { nlpForm: appInfo.form }))
    .then(() => {
      return this.onLifeCycle(appInfo, 'request', [ nlp, action ])
    })
    .catch((error) => {
      logger.error('create app error with appId:' + appId)
      logger.error(error)
    })
}

/**
 *
 * @private
 * @param {string} appId
 * @param {object} [options]
 * @param {'cut' | 'scene'} [options.nlpForm]
 * @param {boolean} [options.preemptive]
 */
AppRuntime.prototype.createOrResumeApp = function createOrResumeApp (appId, options) {
  var self = this

  var nlpForm = _.get(options, 'nlpForm', 'cut')
  var preemptive = _.get(options, 'preemptive', true)

  if (appId === this.getCurrentAppId()) {
    /**
     * App is the currently running one
     */
    logger.info('app is top of stack, skipping resuming', appId)
    return Promise.resolve()
  }

  var appCreated = this.isBackgroundApp(appId)
  if (preemptive) {
    preemptTopOfStack(appCreated)
  }
  if (appCreated) {
    /** No need to recreate app */
    return Promise.resolve()
  }

  // Launch app
  logger.info('app is not running, creating', appId)
  return this.onLifeCycle({
    appId: appId,
    form: nlpForm,
    preemptive: preemptive
  }, 'create')

  function preemptTopOfStack (appCreated) {
    logger.info('preempting top stack for appId', appId)
    if (appCreated) {
      /**
       * Pull the app to foreground if running in background
       */
      logger.info('app is running, resuming', appId)
      self.setForegroundByAppId(appId)
      return
    }

    if (nlpForm === 'scene') {
      // Exit all app on incoming scene nlp
      logger.debug('on scene nlp.')
      return self.destroyAll()
    }
    var last = self.getCurrentAppData()
    if (!last) {
      /** no currently running app */
      logger.debug('no currently running app, skip preempting')
      return
    }

    if (last.form === 'scene') {
      /**
       * currently running app is a scene app, pause it
       */
      logger.debug('pausing current app')
      self.onLifeCycle(last, 'pause')
      return
    }

    /**
     * currently running app is a normal app, destroy it
     */
    logger.debug('destroying current app')
    self.onLifeCycle(last, 'destroy')
  }
}

/**
 * 返回App是否在运行栈中
 * @param {string} appId App的AppID
 * @returns {boolean} 在appIdStack中返回true，否则false
 * @private
 */
AppRuntime.prototype.isAppAlive = function (appId) {
  for (var i = 0; i < this.appIdStack.length; i++) {
    if (appId === this.appIdStack[i]) {
      return true
    }
  }
  return false
}

/**
 * 获取当前运行的appId，如果没有则返回false
 * @returns {string} appId
 * @private
 */
AppRuntime.prototype.getCurrentAppId = function () {
  if (this.appIdStack.length <= 0) {
    return false
  }
  return this.appIdStack[this.appIdStack.length - 1]
}

/**
 * 获取当前App的data，如果没有则返回false
 * @returns {object} App的appData
 * @private
 */
AppRuntime.prototype.getCurrentAppData = function () {
  var appId = this.getCurrentAppId()
  if (!appId) return false
  return this.appDataMap[appId]
}

/**
 * 获取指定的AppData，如果没有则返回false
 * @param {string} appId App的AppID
 * @returns {object} App的appData
 * @private
 */
AppRuntime.prototype.getAppDataById = function (appId) {
  return this.appDataMap[appId] || false
}

/**
 * 获取当前运行的App，如果没有则返回false
 * @returns {object} App实例
 * @private
 */
AppRuntime.prototype.getCurrentApp = function () {
  var appId = this.getCurrentAppId()
  if (!appId) return false
  return this.appMap[appId]
}

/**
 * 给所有App发送destroy事件，销毁所有App
 * @private
 * @param {object} [options]
 * @param {boolean} [options.resetServices]
 */
AppRuntime.prototype.destroyAll = function (options) {
  var resetServices = _.get(options, 'resetServices', true)

  // 依次给正在运行的App发送destroy命令
  var i = 0
  var appId
  // destroy all foreground app
  for (i = 0; i < this.appIdStack.length; i++) {
    appId = this.appIdStack[i]
    if (this.appMap[this.appIdStack[i]]) {
      this.onLifeCycle(appId, 'destroy')
    }
  }
  // destroy all background app
  for (i = 0; i < this.bgAppIdStack.length; i++) {
    appId = this.bgAppIdStack[i]
    if (this.appMap[this.bgAppIdStack[i]]) {
      this.onLifeCycle(appId, 'destroy')
    }
  }
  // 清空正在运行的所有App
  this.appIdStack = []
  this.bgAppIdStack = []
  this.cloudAppIdStack = []
  this.appMap = {}
  this.appDataMap = {}
  this.resetStack()

  if (!resetServices) {
    return
  }

  // reset service
  this.lightMethod('reset', [])
    .then((res) => {
      if (res && res[0] === true) {
        logger.log('reset lightd success')
      } else {
        logger.log('reset lightd failed')
      }
    })
    .catch((error) => {
      logger.log('reset lightd error', error)
    })
  this.multimediaMethod('reset', [])
    .then((res) => {
      if (res && res[0] === true) {
        logger.log('reset multimediad success')
      } else {
        logger.log('reset multimediad failed')
      }
    })
    .catch((error) => {
      logger.log('reset multimediad error', error)
    })
  this.ttsMethod('reset', [])
    .then((res) => {
      if (res && res[0] === true) {
        logger.log('reset ttsd success')
      } else {
        logger.log('reset ttsd failed')
      }
    })
    .catch((error) => {
      logger.log('reset ttsd error', error)
    })
}

/**
 * Emit life cycle event to app asynchronously
 * @private
 * @param {object | string} appInfo - app info object or app id
 * @param {boolean} appInfo.appId
 * @param {boolean} [appInfo.form]
 * @param {boolean} [appInfo.cloud]
 * @param {string} event -
 * @param {any[]} params -
 * @returns {Promise<void>} LifeCycle events are asynchronous
 */
AppRuntime.prototype.onLifeCycle = function onLifeCycle (appInfo, event, params) {
  logger.log(`on life cycle '${event}'`)

  var appId
  if (typeof appInfo === 'string') {
    appId = appInfo
    appInfo = { appId: appId }
  } else {
    appId = _.get(appInfo, 'appId')
  }
  var cloud = _.get(appInfo, 'cloud', false)
  if (cloud) {
    appId = '@cloud'
  }

  if (event === 'create') {
    // 启动应用
    if (this.apps[appId]) {
      return this.apps[appId].create(appId, this)
        .then((app) => {
          if (app) {
            // 执行create生命周期
            emit(app)
            // 当前App正在运行
            this.appIdStack.push(appId)
            this.appMap[appId] = app
            this.appDataMap[appId] = appInfo
          }
        })
    } else {
      // fix: should create miss app here
      logger.log('not find appid: ', appId)
      return Promise.resolve()
    }
  }

  var app = this.appMap[appId]
  if (app == null) {
    return Promise.reject(new Error('app instance not found, you should wait for creation of a lifecycle event to complete'))
  }

  emit(app)

  if (event === 'destroy') {
    this.apps[appId].destruct(app, this)
    this.deleteAppById(appId)
  }
  this.updateStack()
  return Promise.resolve()

  function emit (target) {
    EventEmitter.prototype.emit.apply(target, [ event ].concat(params))
  }
}

/**
 * 更新App stack
 * @private
 */
AppRuntime.prototype.updateStack = function () {
  var scene = ''
  var cut = ''
  // keep these codes for future reference, maybe useful
  // logger.log('stack', this.appIdStack);
  // for (var i = this.appIdOriginStack.length - 1; i >= 0; i--) {
  //   AppData = this.getAppDataById(this.appIdOriginStack[i]);
  //   if (scene === '' && AppData.form === 'scene') {
  //     scene = AppData.appId;
  //   }
  //   if (cut === '' && AppData.form !== 'scene') {
  //     cut = AppData.appId;
  //   }
  // }
  // logger.log('AppData.appId: ' + AppData.appId + ' form: ' + AppData.form)
  // if (AppData.form === 'cut') {
  //   this.domain.cut = AppData.appId
  // }
  // if (AppData.form === 'scene') {
  //   this.domain.scene = AppData.appId
  // }
  // logger.log('domain', this.domain)
  // this.emit('setStack', this.domain.scene + ':' + this.domain.cut)
  var item
  for (var i = this.appIdStack.length - 1; i >= 0; i--) {
    // we map all cloud skills to the cloud app, so here we want to expand the cloud app's stack
    if (this.appIdStack[i] === '@cloud') {
      for (var j = this.cloudAppIdStack.length - 1; j >= 0; j--) {
        item = this.cloudAppIdStack[j]
        if (scene === '' && item.form === 'scene') {
          scene = item.appId
        }
        if (cut === '' && item.form !== 'scene') {
          cut = item.appId
        }
      }
    } else {
      item = this.getAppDataById(this.appIdStack[i])
      if (scene === '' && item.form === 'scene') {
        scene = item.appId
      }
      if (cut === '' && item.form !== 'scene') {
        cut = item.appId
      }
    }
  }
  if (scene !== this.domain.scene || cut !== this.domain.cut) {
    this.domain.scene = scene
    this.domain.cut = cut
    var ids = [scene, cut].map(it => {
      /**
       * Exclude local convenience app from cloud skill stack
       */
      if (_.startsWith(it, '@')) {
        return ''
      }
      /**
       * Exclude apps from cloud skill stack
       * - composition-de-voix
       */
      if (['RB0BF7E9D7F84B2BB4A1C2990A1EF8F5'].indexOf(it) >= 0) {
        return ''
      }
      return it
    })
    this.emit('setStack', ids.join(':'))
  }
}

AppRuntime.prototype.resetStack = function () {
  this.domain.cut = ''
  this.domain.scene = ''
  this.emit('setStack', this.domain.scene + ':' + this.domain.cut)
}

/**
 * 调用speech的pickup
 * @param {boolean} isPickup
 * @private
 */
AppRuntime.prototype.setPickup = function (isPickup, duration) {
  if (isPickup === true) {
    this.lightMethod('setPickup', ['' + (duration || 6000)])
  }
  this.emit('setPickup', isPickup)
}

AppRuntime.prototype.setConfirm = function (appId, intent, slot, options, attrs, callback) {
  if (this.cloudApi) {
    this.cloudApi.sendConfirm(appId, intent, slot, options, attrs, (error) => {
      if (error) {
        callback(error)
      } else {
        this.setPickup(true)
        callback()
      }
    })
  } else {
    callback(new Error('cloudApi not found'))
  }
}

/**
 * 退出App。由应用自身在退出时手动调用，向系统表明该应用可以被销毁了
 * @param {string} appId extapp的AppID
 * @private
 */
AppRuntime.prototype.exitAppById = function (appId) {
  // silent when the background app exits
  if (this.isBackgroundApp(appId)) {
    this.deleteBGAppById(appId)
  } else {
    // 调用生命周期结束该应用
    this.onLifeCycle(appId, 'destroy')
    // 如果上一个应用是scene，则需要resume恢复运行
    var last = this.getCurrentAppData()
    if (last) {
      this.onLifeCycle(last, 'resume')
    }
  }
}

/**
 * @param {string} appId extapp的AppID
 * @private
 */
AppRuntime.prototype.exitAppByIdForce = function (appId) {
  // silent when the background app exits
  if (this.isBackgroundApp(appId)) {
    this.deleteBGAppById(appId)
  } else {
    this.deleteAppById(appId)
  }
  var last = this.getCurrentAppData()
  if (last) {
    this.onLifeCycle(last, 'resume')
  }
}

/**
 * delete the foreground app with appId
 * @param {string} appId AppID
 * @private
 */
AppRuntime.prototype.deleteAppById = function (appId) {
  // 删除指定AppID
  for (var i = 0; i < this.appIdStack.length; i++) {
    if (this.appIdStack[i] === appId) {
      this.appIdStack.splice(i, 1)
      break
    }
  }
  // 释放该应用
  delete this.appMap[appId]
  delete this.appDataMap[appId]
}

/**
 * delete the background app with appId
 * @param {string} appId AppID
 * @private
 */
AppRuntime.prototype.deleteBGAppById = function (appId) {
  for (var i = 0; i < this.bgAppIdStack.length; i++) {
    if (this.bgAppIdStack[i] === appId) {
      this.bgAppIdStack.splice(i, 1)
      break
    }
  }
  // 释放该应用
  delete this.appMap[appId]
  delete this.appDataMap[appId]
}

/**
 * 通过dbus注册extapp
 * @param {string} appId extapp的AppID
 * @param {object} profile extapp的profile
 * @private
 */
AppRuntime.prototype.registerExtApp = function (appId, profile) {
  logger.log('register extapp with id: ', appId)
  // 配置exitApp的默认权限
  this.permission.load(appId, ['ACCESS_TTS', 'ACCESS_MULTIMEDIA'])
  this.apps[appId] = new AppExecutor(profile)
}

/**
 * 删除extapp
 * @param {string} appId
 * @private
 */
AppRuntime.prototype.deleteExtApp = function (appId) {

}

AppRuntime.prototype.isBackgroundApp = function (appId) {
  for (var i = 0; i < this.bgAppIdStack.length; i++) {
    if (this.bgAppIdStack[i] === appId) {
      return true
    }
  }
  return false
}

AppRuntime.prototype.setBackgroundByAppId = function (appId) {
  var index = -1
  for (var i = this.appIdStack.length - 1; i >= 0; i--) {
    if (this.appIdStack[i] === appId) {
      index = i
      break
    }
  }
  if (index === -1) {
    return false
  }
  this.appIdStack.splice(index, 1)
  this.bgAppIdStack.push(appId)
  // try to resume previou app
  var cur = this.getCurrentAppData()
  if (cur) {
    this.onLifeCycle(cur, 'resume')
  }
  return true
}

AppRuntime.prototype.setForegroundByAppId = function (appId) {
  var index = -1
  for (var i = this.bgAppIdStack.length - 1; i >= 0; i--) {
    if (this.bgAppIdStack[i] === appId) {
      index = i
      break
    }
  }
  if (index === -1) {
    return false
  }
  this.bgAppIdStack.splice(index, 1)
  // try to pause current app
  var cur = this.getCurrentAppData()
  if (cur) {
    this.onLifeCycle(cur, 'pause')
  }
  this.appIdStack.push(appId)
  return true
}

/**
 * mock nlp response
 * @param {object} nlp
 * @param {object} action
 * @private
 */
AppRuntime.prototype.mockNLPResponse = function (nlp, action) {
  if (nlp.appId === this.getCurrentAppId()) {
    var appInfo = {
      appId: nlp.appId,
      cloud: nlp.cloud,
      form: action.response.action.form
    }
    this.onLifeCycle(appInfo, 'request', [ nlp, action ])
  }
}

/**
 * sync cloudappclient appid stack
 * @param {Array} stack appid stack
 * @private
 */

AppRuntime.prototype.syncCloudAppIdStack = function (stack) {
  this.cloudAppIdStack = stack || []
  logger.log('cloudStack', this.cloudAppIdStack)
  this.updateStack()
  return Promise.resolve()
}

/**
 *
 * @param {string} appId
 * @param {object} nlp
 * @param {object} action
 * @param {object} [options]
 * @param {boolean} [options.preemptive]
 */
AppRuntime.prototype.startApp = function (appId, nlp, action, options) {
  nlp.cloud = false
  nlp.appId = appId
  action = {
    appId: appId,
    startWithActiveWord: false,
    response: {
      action: action || {}
    }
  }
  action.response.action.appId = appId
  action.response.action.form = 'cut'
  this.onVoiceCommand('', nlp, action, options)
}

/**
 * 接收Mqtt的topic
 * @param {string} topic
 * @param {string} message
 * @private
 */
AppRuntime.prototype.onMqttMessage = function (topic, message) {
  this.emit(topic, message)
}

/**
 * 处理Mqtt的topic
 * @private
 */
AppRuntime.prototype.handleMqttMessage = function () {
  this.on('cloud_forward', this.onCloudForward.bind(this))
  this.on('reset_settings', this.onResetSettings.bind(this))
}

/**
 * 处理App发送过来的模拟NLP
 * @param {string} message
 * @private
 */
AppRuntime.prototype.onCloudForward = function (message) {
  try {
    var msg = JSON.parse(message)
    var params = JSON.parse(msg.content.params)
    // 模拟nlp
    this.onVoiceCommand('', params.nlp, params.action)
  } catch (err) {
    logger.error(err && err.stack)
  }
}

/**
 * 处理App发送的恢复出厂设置
 * @param {string} message
 * @private
 */
AppRuntime.prototype.onResetSettings = function (message) {
  if (message === '1') {
    logger.log('当前不支持恢复出厂设置')
  }
}

/**
 * @private
 */
AppRuntime.prototype.lightMethod = function (name, args) {
  return new Promise((resolve, reject) => {
    var sig = args.map(() => 's').join('')
    this.service._dbus.callMethod(
      'com.service.light',
      '/rokid/light',
      'com.rokid.light.key',
      name, sig, args, function (res) {
        resolve(res)
      })
  })
}

/**
 * @private
 */
AppRuntime.prototype.ttsMethod = function (name, args) {
  return new Promise((resolve, reject) => {
    var sig = args.map(() => 's').join('')
    this.service._dbus.callMethod(
      'com.service.tts',
      '/tts/service',
      'tts.service',
      name, sig, args, function (res) {
        resolve(res)
      })
  })
}

AppRuntime.prototype.multimediaMethod = function (name, args) {
  return new Promise((resolve, reject) => {
    var sig = args.map(() => 's').join('')
    this.service._dbus.callMethod(
      'com.service.multimedia',
      '/multimedia/service',
      'multimedia.service',
      name, sig, args, function (res) {
        resolve(res)
      })
  })
}

AppRuntime.prototype.listenDbusSignals = function () {
  var self = this
  var proxy = new DbusRemoteCall(this.service._bus)
  var ttsEvents = {
    'ttsdevent': function onTtsEvent (msg) {
      var channel = `callback:tts:${_.get(msg, 'args.0')}`
      EventEmitter.prototype.emit.apply(
        self.dbusSignalRegistry,
        [ channel ].concat(msg.args.slice(1))
      )
    }
  }
  proxy.listen(
    'com.service.tts',
    '/tts/service',
    'tts.service',
    function onTtsEvent (msg) {
      var handler = ttsEvents[msg && msg.name]
      if (handler == null) {
        logger.warn(`Unknown ttsd event type '${msg && msg.name}'.`)
        return
      }
      handler(msg)
    }
  )

  var multimediaEvents = {
    'multimediadevent': function onMultimediaEvent (msg) {
      var channel = `callback:multimedia:${_.get(msg, 'args.0')}`
      EventEmitter.prototype.emit.apply(
        self.dbusSignalRegistry,
        [ channel ].concat(msg.args.slice(1))
      )
    }
  }
  proxy.listen(
    'com.service.multimedia',
    '/multimedia/service',
    'multimedia.service',
    function onMultimediaEvent (msg) {
      var handler = multimediaEvents[msg && msg.name]
      if (handler == null) {
        logger.warn(`Unknown multimediad event type '${msg && msg.name}'.`)
        return
      }
      handler(msg)
    }
  )
}

/**
 * @private
 */
AppRuntime.prototype.onGetPropAll = function () {
  return {}
}

/**
 * @private
 */
AppRuntime.prototype.onReconnected = function () {
  this.destroyAll()
  this.lightMethod('setConfigFree', ['system'])
}

/**
 * @private
 */
AppRuntime.prototype.onDisconnected = function () {
  this.login = false
  this.destroyAll()
  logger.log('network disconnected, please connect to wifi first')
  this.startApp('@network', {}, {})
}

/**
 * @private
 */
AppRuntime.prototype.onReLogin = function () {
  this.login = true
  perf.stub('started')
  this.lightMethod('setWelcome', [])

  var config = JSON.stringify(this.onGetPropAll())
  this.ttsMethod('connect', [config])
    .then((res) => {
      if (!res) {
        logger.log('send CONFIG to ttsd ignore: ttsd service may not start')
      } else {
        logger.log(`send CONFIG to ttsd: ${res && res[0]}`)
      }
    })
    .catch((error) => {
      logger.log('send CONFIG to ttsd failed: call method failed', error)
    })
}

/**
 * 启动extApp dbus接口
 * @private
 */
AppRuntime.prototype.startExtappService = function () {
  var self = this
  var service = dbus.registerService('session', dbusConfig.service)
  this.service = service

  function createInterface (name) {
    var object = service.createObject(dbusConfig[name].objectPath)
    return object.createInterface(dbusConfig[name].interface)
  }
  /**
   * Create extapp service
   */
  var extapp = createInterface('extapp')
  extapp.addMethod('register', {
    in: ['s', 's', 's'],
    out: ['b']
  }, function (appId, objectPath, ifaceName, cb) {
    if (self.login === true) {
      self.registerExtApp(appId, {
        metadata: {
          extapp: true,
          daemon: true,
          dbusConn: {
            objectPath: objectPath,
            ifaceName: ifaceName
          }
        }
      })
      cb(null, true)
    } else {
      cb(null, false)
    }
  })
  extapp.addMethod('destroy', {
    in: ['s'],
    out: []
  }, function (appId, cb) {
    self.deleteExtApp(appId)
    cb(null)
  })
  extapp.addMethod('start', {
    in: ['s'],
    out: []
  }, function (appId, cb) {
    cb(null)
  })
  extapp.addMethod('setPickup', {
    in: ['s', 's', 's'],
    out: []
  }, function (appId, isPickup, duration, cb) {
    if (appId !== self.getCurrentAppId()) {
      logger.log('set pickup permission deny')
      cb(null)
    } else {
      self.setPickup(isPickup === 'true', +duration)
      cb(null)
    }
  })
  extapp.addMethod('setConfirm', {
    in: ['s', 's', 's', 's', 's'],
    out: ['b']
  }, function (appId, intent, slot, options, attrs, cb) {
    try {
      options = JSON.parse(options)
      attrs = JSON.parse(attrs)
    } catch (error) {
      logger.log('setConfirm Error: ', error)
      cb(null, false)
      return
    }
    self.setConfirm(appId, intent, slot, options, attrs, (error) => {
      if (error) {
        logger.log(error)
        cb(null, false)
      } else {
        cb(null, true)
      }
    })
  })
  extapp.addMethod('exit', {
    in: ['s'],
    out: []
  }, function (appId, cb) {
    if (appId !== self.getCurrentAppId()) {
      logger.log('exit app permission deny')
      cb(null)
    } else {
      self.exitAppByIdForce(appId)
      cb(null)
    }
  })
  extapp.addMethod('destroyAll', {
    in: [],
    out: ['b']
  }, function (cb) {
    self.destroyAll()
    cb(null, true)
  })
  extapp.addMethod('mockNLPResponse', {
    in: ['s', 's', 's'],
    out: []
  }, function (appId, nlp, action, cb) {
    cb(null)
    try {
      nlp = JSON.parse(nlp)
      action = JSON.parse(action)
    } catch (error) {
      logger.log('mockNLPResponse, invalid nlp or action')
      return
    }
    self.mockNLPResponse(nlp, action)
  })
  extapp.addMethod('setBackground', {
    in: ['s'],
    out: ['b']
  }, function (appId, cb) {
    if (appId) {
      var result = self.setBackgroundByAppId(appId)
      cb(null, result)
    } else {
      cb(null, false)
    }
  })
  extapp.addMethod('setForeground', {
    in: ['s'],
    out: ['b']
  }, function (appId, cb) {
    if (appId) {
      var result = self.setForegroundByAppId(appId)
      cb(null, result)
    } else {
      cb(null, false)
    }
  })
  extapp.addMethod('syncCloudAppIdStack', {
    in: ['s'],
    out: ['b']
  }, function (stack, cb) {
    self.syncCloudAppIdStack(JSON.parse(stack || '[]'))
    cb(null, true)
  })

  /**
   * Create prop service
   */
  var prop = createInterface('prop')
  prop.addMethod('all', {
    in: ['s'],
    out: ['s']
  }, function (appId, cb) {
    var config = self.onGetPropAll()
    cb(null, JSON.stringify(config))
  })

  /**
   * Create permission service
   */
  var permission = createInterface('permission')
  permission.addMethod('check', {
    in: ['s', 's'],
    out: ['s']
  }, function (appId, name, cb) {
    var permit = self.permission.check(appId, name)
    logger.log('vui.permit', permit, appId, name)
    if (permit) {
      cb(null, 'true')
    } else {
      cb(new Error('permission deny'), 'false')
    }
  })

  /**
   * Create amsexport service
   */
  var amsexport = createInterface('amsexport')
  amsexport.addMethod('ReportSysStatus', {
    in: ['s'],
    out: ['b']
  }, function (status, cb) {
    try {
      var data = JSON.parse(status)
      if (data.upgrade === true) {
        self.startApp('@upgrade', {}, {})
      } else if (data['Wifi'] === false || data['Network'] === false) {
        self.onEvent('disconnected', {})
      } else if (data['Network'] === true && !self.online) {
        self.onEvent('connected', {})
      }
      cb(null, true)
    } catch (err) {
      logger.error(err && err.stack)
      cb(null, false)
    }
  })
  amsexport.addMethod('SetTesting', {
    in: ['s'],
    out: ['b']
  }, function (testing, cb) {
    logger.log('set testing' + testing)
    cb(null, true)
  })
  amsexport.addMethod('SendIntentRequest', {
    in: ['s', 's', 's'],
    out: ['b']
  }, function (asr, nlp, action, cb) {
    console.log('sendintent', asr, nlp, action)
    self.onEvent('nlp', {
      asr: asr,
      nlp: nlp,
      action: action
    })
    cb(null, true)
  })
  amsexport.addMethod('Reload', {
    in: [],
    out: ['b']
  }, function (cb) {
    cb(null, true)
  })
  amsexport.addMethod('Ping', {
    in: [],
    out: ['b']
  }, function (cb) {
    logger.log('YodaOS is alive')
    cb(null, true)
  })
  amsexport.addMethod('ForceUpdateAvailable', {
    in: [],
    out: []
  }, function (cb) {
    logger.info('force update available, waiting for incoming voice')
    self.forceUpdateAvailable = true
    cb(null)
  })
}

AppRuntime.prototype.destroy = function destroyRuntime () {
  this._input.disconnect()
}

AppRuntime.prototype.listenKeyboardEvents = listenKeyboardEvents
function listenKeyboardEvents () {
  var currentKeyCode
  var firstLongPressTime = null

  this._input.on('keydown', event => {
    currentKeyCode = event.keyCode
    logger.info(`keydown: ${event.keyCode}`)
  })

  this._input.on('keyup', event => {
    logger.info(`keyup: ${event.keyCode}, currentKeyCode: ${currentKeyCode}`)
    if (currentKeyCode !== event.keyCode) {
      return
    }
    if (firstLongPressTime != null) {
      firstLongPressTime = null
      return
    }

    /** Click Events */
    var map = {
      113: () => {
        /** mute */
        var muted = !this.micMuted
        this.micMuted = muted
        this.emit('micMute', muted)
        if (muted) {
          this.startApp('@volume', { intent: 'mic_mute', silent: true }, {}, { preemptive: false })
          return
        }
        this.startApp('@volume', { intent: 'mic_unmute', silent: true }, {}, { preemptive: false })
      },
      114: () => {
        /** decrease volume */
        this.startApp('@volume',
          { intent: 'volumedown', partition: 16, silent: true },
          {},
          { preemptive: false })
      },
      115: () => {
        /** increase volume */
        this.startApp('@volume',
          { intent: 'volumeup', partition: 16, silent: true },
          {},
          { preemptive: false })
      },
      116: () => {
        /** exit all app */
        this.startApp('ROKID.SYSTEM', { intent: 'ROKID.SYSTEM.EXIT' }, {})
      }
    }

    var handler = map[event.keyCode]
    if (handler) {
      handler()
    }
  })

  this._input.on('longpress', event => {
    if (currentKeyCode !== event.keyCode) {
      firstLongPressTime = null
      return
    }
    if (firstLongPressTime == null) {
      firstLongPressTime = event.keyTime
    }
    var timeDelta = event.keyTime - firstLongPressTime
    logger.info(`longpress: ${event.keyCode}, time: ${timeDelta}`)

    /** Long Press Events */
    var map = {
      113: () => {
        if (timeDelta >= 2000) {
          /** mute */
          this.startApp('@bluetooth', { intent: 'bluetooth_broadcast' }, {})
        }
      },
      114: () => {
        /** decrease volume */
        this.startApp('@volume',
          { intent: 'volumedown', partition: 16, silent: true },
          {},
          { preemptive: false })
      },
      115: () => {
        /** increase volume */
        this.startApp('@volume',
          { intent: 'volumeup', partition: 16, silent: true },
          {},
          { preemptive: false })
      }
    }
    var handler = map[event.keyCode]
    if (handler) {
      handler()
    }
  })
}
