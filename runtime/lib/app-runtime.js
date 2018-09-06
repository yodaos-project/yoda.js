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
var DbusAppExecutor = require('./app/dbus-app-executor')
var env = require('./env')()
var logger = require('logger')('yoda')
var ota = require('@yoda/ota')
var Input = require('@yoda/input')
var Lifetime = require('./component/lifetime')

module.exports = AppRuntime
perf.stub('init')

/**
 * @memberof yodaRT
 * @constructor
 * @param {Array} paths - the pathname
 */
function AppRuntime (paths) {
  EventEmitter.call(this)
  this.config = {
    host: env.cloudgw.wss,
    port: 443,
    deviceId: null,
    deviceTypeId: null,
    key: null,
    secret: null
  }

  this.cloudAppIdStack = []
  // save the skill's id domain
  this.domain = {
    cut: '',
    scene: ''
  }

  // manager app's permission
  this.permission = new Permission(this)

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
  this.startDbusAppService()
  // 处理mqtt事件
  this.handleMqttMessage()
  // handle keyboard/button events
  this._input = Input()
  this.listenKeyboardEvents()

  this.dbusSignalRegistry = new EventEmitter()
  this.listenDbusSignals()

  this.loadAppComplete = false
  // 加载APP
  this.executors = {}
  this.loadApp(paths, (err, executors) => {
    if (err) {
      throw err
    }
    this.life = new Lifetime(executors)
    this.loadAppComplete = true
    logger.log('load app complete')
    this.startDaemonApps().then(() => {
      this.startApp('@volume', { intent: 'init_volume' }, {}, { preemptive: false })
    })
  })
}
inherits(AppRuntime, EventEmitter)

/**
 * 根据应用包安装目录加载所有应用
 * @param {String[]} paths 应用包的安装目录
 * @param {Function} cb 加载完成的回调，回调没有参数
 * @private
 */
AppRuntime.prototype.loadApp = function loadApp (paths, cb) {
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
  loadAppDir(paths, function (dirs) {
    // 检查目录下是否有App包
    if (dirs.length <= 0) {
      logger.log('no app load')
      cb()
      return
    }
    logger.log('load app num: ', dirs.length)
    // 加载APP
    var loadApp = function (index) {
      self.load(dirs[index], function (err, stage) {
        if (err) {
          // logger.log('load app error: ', err);
        }
        index++
        if (index < dirs.length) {
          loadApp(index)
        } else {
          // 加载完成回调
          cb(null, self.executors)
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
AppRuntime.prototype.load = function load (root, callback) {
  var prefix = root
  var pkgInfo
  logger.log('load app: ' + root)
  fs.readFile(prefix + '/package.json', 'utf8', (err, data) => {
    if (err) {
      return callback(err)
    }
    pkgInfo = JSON.parse(data)
    if (!Array.isArray(_.get(pkgInfo, 'metadata.skills'))) {
      return callback(new Error('invalid app format: ' + root))
    }

    for (var i in pkgInfo.metadata.skills) {
      var id = pkgInfo.metadata.skills[i]
      // 加载权限配置
      this.permission.load(id, pkgInfo.metadata.permission || [])
      if (this.executors[id]) {
        // 打印调试信息
        logger.log('load app path: ', prefix)
        logger.log('skill id: ', id)
        throw new Error('skill conflicts')
      }
      var app = new AppExecutor(pkgInfo, prefix, id, this)
      this.executors[id] = app
    }

    callback(null, this.executors)
  })
}

AppRuntime.prototype.startDaemonApps = function startDaemonApps () {
  var self = this
  var daemons = Object.keys(self.life.executors).map(appId => {
    var executor = self.life.executors[appId]
    if (!executor.daemon) {
      return
    }
    return appId
  }).filter(it => it)

  return start(0)
  function start (idx) {
    if (idx > daemons.length - 1) {
      return Promise.resolve()
    }
    var appId = daemons[idx]
    logger.info('Starting daemon app', appId)
    return self.life.createApp(appId)
      .then(() => self.life.setBackgroundById(appId))
      .then(() => {
        return start(idx + 1)
      }, () => {
        /** ignore error and continue populating */
        return start(idx + 1)
      })
  }
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
  } else if (name === 'cloud event') {
    console.log('---------------- cloud event', data)
    this.sendNLPToApp('@network', {
      intent: 'cloud_status'
    }, {
      code: data.code,
      msg: data.msg
    })
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
 * @param {boolean} [options.byCarrier]
 */
AppRuntime.prototype.onVoiceCommand = function (asr, nlp, action, options) {
  var carrierId = _.get(options, 'carrierId')

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
    return Promise.resolve()
  }
  return this.life.createApp(appId)
    .then(() => this.life.activateAppById(appId, appInfo.form, carrierId))
    .then(() => this.life.onLifeCycle(appId, 'request', [ nlp, action ]))
    .catch((error) => {
      logger.error('create app error with appId:' + appId, error)
      throw error
    })
}

/**
 * 给所有App发送destroy事件，销毁所有App
 * @private
 * @param {object} [options]
 * @param {boolean} [options.resetServices]
 */
AppRuntime.prototype.destroyAll = function (options) {
  var resetServices = _.get(options, 'resetServices', true)

  this.life.destroyAll()
  // 清空正在运行的所有App
  this.cloudAppIdStack = []
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
 * 更新App stack
 * @private
 */
AppRuntime.prototype.updateStack = function () {
  var scene = ''
  var cut = ''
  var item
  for (var i = this.life.appIdStack.length - 1; i >= 0; i--) {
    // we map all cloud skills to the cloud app, so here we want to expand the cloud app's stack
    var appId = this.life.appIdStack[i]
    if (appId === '@cloud') {
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
      item = this.life.getAppDataById(appId)
      if (scene === '' && item.form === 'scene') {
        scene = appId
      }
      if (cut === '' && item.form !== 'scene') {
        cut = appId
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
 * 通过dbus注册extapp
 * @param {string} appId extapp的AppID
 * @param {object} profile extapp的profile
 * @private
 */
AppRuntime.prototype.registerDbusApp = function (appId, objectPath, ifaceName) {
  logger.log('register dbus app with id: ', appId)
  // 配置exitApp的默认权限
  this.permission.load(appId, ['ACCESS_TTS', 'ACCESS_MULTIMEDIA'])
  this.life.executors[appId] = new DbusAppExecutor(objectPath, ifaceName, appId, this)
}

/**
 * 删除extapp
 * @param {string} appId
 * @private
 */
AppRuntime.prototype.deleteDbusApp = function (appId) {

}

/**
 * mock nlp response
 * @param {object} nlp
 * @param {object} action
 * @private
 */
AppRuntime.prototype.mockNLPResponse = function (nlp, action) {
  var appId = nlp.cloud ? '@cloud' : nlp.appId
  if (appId === this.life.getCurrentAppId()) {
    this.life.onLifeCycle(appId, 'request', [ nlp, action ])
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
 * @private
 */
AppRuntime.prototype.sendNLPToApp = function (appId, nlp, action) {
  var curAppId = this.life.getCurrentAppId()
  if (curAppId === appId) {
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
    this.life.onLifeCycle(appId, 'request', [nlp, action])
  } else {
    logger.log('send NLP to App faild, AppId ' + appId + ' not in active')
  }
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
  this.lightMethod('setConfigFree', ['system'])
}

/**
 * @private
 */
AppRuntime.prototype.onDisconnected = function () {
  this.login = false
  this.destroyAll()
  logger.log('network disconnected, please connect to wifi first')
  this.startApp('@network', {
    intent: 'system_setup'
  }, {})
}

/**
 * @private
 */
AppRuntime.prototype.onReLogin = function () {
  this.destroyAll()
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
AppRuntime.prototype.startDbusAppService = function () {
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
    logger.info('dbus registering app', appId, objectPath, ifaceName)
    if (self.login === true) {
      self.registerDbusApp(appId, objectPath, ifaceName)
      cb(null, true)
    } else {
      cb(null, false)
    }
  })
  extapp.addMethod('destroy', {
    in: ['s'],
    out: []
  }, function (appId, cb) {
    self.deleteDbusApp(appId)
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
    if (appId !== self.life.getCurrentAppId()) {
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
    if (appId !== self.life.getCurrentAppId()) {
      logger.log('exit app permission deny')
      cb(null)
    } else {
      self.life.destroyAppById(appId)
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
      var result = self.life.setBackgroundById(appId)
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
      var result = self.life.setForegroundById(appId)
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
  extapp.addMethod('tts', {
    in: ['s', 's'],
    out: ['s']
  }, function (appId, text, cb) {
    if (self.life.executors[appId] === undefined) {
      return cb(null, '-1')
    }
    var permit = self.permission.check(appId, 'ACCESS_TTS')
    if (permit) {
      self.ttsMethod('speak', [appId, text])
        .then((res) => {
          var ttsId = res[0]
          cb(null, ttsId)
          var channel = `callback:tts:${ttsId}`
          var app = self.apps[appId]
          if (ttsId !== '-1') {
            self.dbusSignalRegistry.once(channel, function () {
              self.service._dbus.emitSignal(
                app.objectPath,
                app.ifaceName,
                'onTtsComplete',
                's',
                [ttsId]
              )
            })
          }
        })
    } else {
      cb(null, '-1')
    }
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
      cb(null, 'false')
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
      logger.log('report:' + status)
      var data = JSON.parse(status)
      if (data.upgrade === true) {
        self.startApp('@upgrade', {}, {})
      } else if (data['Wifi'] === false || data['Network'] === false) {
        self.onEvent('disconnected', {})
      } else if (data['Network'] === true && !self.online) {
        self.onEvent('connected', {})
      } else if (data['msg']) {
        logger.log(`network report ${data.msg}`)
        self.sendNLPToApp('@network', {
          intent: 'wifi_status'
        }, {
          status: data['msg'],
          value: data['data']
        })
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
