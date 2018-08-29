'use strict'

var EventEmitter = require('events').EventEmitter
var inherits = require('util').inherits
var logger = require('logger')('extapp')
var property = require('@yoda/property')

var MEDIA_SOURCE = '/opt/media/'
var LIGHT_SOURCE = '/opt/light/'

function pathTransform (name, prefix, home) {
  var len = name.length
  var absPath = ''
  // etc.. system://path/to/sound.ogg
  if (len > 9 && name.substr(0, 9) === 'system://') {
    absPath = prefix + name.substr(9)
    // etc.. self://path/to/sound.ogg
  } else if (len > 7 && name.substr(0, 7) === 'self://') {
    absPath = home + '/' + name.substr(7)
    // etc.. path/to/sound.ogg
  } else {
    absPath = home + '/' + name
  }
  return absPath
}

/**
 * 实际App执行对象
 */
function Application () {
  EventEmitter.call(this)
}
inherits(Application, EventEmitter)
// -----------------------------------------------------------------------

function ExtAppService (Adapter, options) {
  EventEmitter.call(this)
  this.appHome = ''
  this.options = options || {}
  this.appIdStack = []
  this.apps = {}

  this.preload = false

  this.ttsCallback = {}
  this.multiMediaCallback = {}

  this.adapter = new Adapter(this.options)
  // 监听vui发送的App事件，包括App生命周期和TTS、media的事件
  this.adapter.listenAppEvent((name, args) => {
    this.onEvent(name, args)
  })
    .then(() => {
      // service 监听成功事件
      this.emit('ready')
      this.handleEvent()
    })
    .catch((err) => {
      logger.log('listen AppEvent failed')
      // service 监听失败事件
      this.emit('error', err)
    })
  // 监听vui通知事件，例如vui重启事件
  this.adapter.listenVuiEvent((name, args) => {
    this.onVuiEvent(name, args)
  })
    .catch((err) => {
      logger.log('listen VuiEvent failed')
      this.emit('error', err)
    })

  this.adapter.listenTtsdEvent((name, args) => {
    // ttsd的event事件
    if (name === 'ttsdevent') {
      logger.log('tts-event', args)
      if (typeof this.ttsCallback['ttscb:' + args[0]] === 'function') {
        this.ttsCallback['ttscb:' + args[0]](args[1], args.slice(2))
        // 下面事件完成后不会再触发其它事件，也不应该触发，删除对应cb，防止内存泄漏
        logger.log('unregister', args[0])
        delete this.ttsCallback['ttscb:' + args[0]]
      }
    }
  }).catch((err) => {
    logger.log('ttsd listen error', err)
  })

  this.adapter.listenMultimediadEvent((name, args) => {
    if (name === 'multimediadevent') {
      logger.log('media-event', args)
      if (typeof this.multiMediaCallback['mediacb:' + args[0]] === 'function') {
        this.multiMediaCallback['mediacb:' + args[0]](args.slice(1))
      }
    }
  }).catch((err) => {
    logger.log('mediad listen error', err)
  })
}
inherits(ExtAppService, EventEmitter)

ExtAppService.prototype.create = function (appId, preload) {
  if (appId === undefined || typeof appId !== 'string') {
    return null
  }
  var self = this
  // 创建实例App
  var app = new Application()
  this.apps[appId] = app
  this.appIdStack.push(appId)
  // 注入服务
  app.getAppId = function () {
    return appId
  }
  app.get = function (key) {
    return new Promise((resolve, reject) => {
      self.adapter.propMethod(key, [appId])
        .then((args) => {
          // 目前只支持一个参数，考虑改成参数数组，或者resolve支持参数展开
          resolve(args)
        })
        .catch((err) => {
          reject(err)
        })
    })
  }
  app.mockNLPResponse = function (nlp, action) {
    app.emit('onrequest', nlp, action)
  }
  app.exit = function () {
    self.onEvent('onDestroy', [])
    return self.adapter.extAppMethod('exit', [appId])
  }
  app.destroyAll = function () {
    return self.adapter.extAppMethod('destroyAll', [appId])
  }
  app.setPickup = function (isPickup) {
    return self.adapter.extAppMethod('setPickup', [appId, isPickup === true ? 'true' : 'false'])
  }
  app.setConfirm = function (intent, slot, options, attrs) {
    return new Promise((resolve, reject) => {
      if (intent === undefined || intent === '') {
        reject(new Error('intent required'))
        return
      }
      if (slot === undefined) {
        reject(new Error('slot required'))
        return
      }
      slot = JSON.stringify(slot)
      options = JSON.stringify(options || [])
      attrs = JSON.stringify(attrs || {})
      self.adapter.extAppMethod('setConfirm', [appId, intent, slot, options, attrs])
        .then((res) => {
          if (res && res[0] === true) {
            resolve()
          } else {
            reject(new Error('sendConfirm failed'))
          }
        })
        .catch((error) => {
          reject(error)
        })
    })
  }
  app.setBackground = function () {
    return new Promise((resolve, reject) => {
      self.adapter.extAppMethod('setBackground', [appId])
        .then((res) => {
          if (res && res[0] === true) {
            resolve()
          } else {
            reject(new Error('push the app in bckground error'))
          }
        })
        .catch((error) => {
          reject(error)
        })
    })
  }
  app.setForeground = function () {
    return new Promise((resolve, reject) => {
      self.adapter.extAppMethod('setForeground', [appId])
        .then((res) => {
          if (res && res[0] === true) {
            resolve()
          } else {
            reject(new Error('push the app in foreground error'))
          }
        })
        .catch((error) => {
          reject(error)
        })
    })
  }
  app.syncCloudAppIdStack = function (stack) {
    return new Promise((resolve, reject) => {
      self.adapter.extAppMethod('syncCloudAppIdStack', [JSON.stringify(stack || [])])
        .then((res) => {
          if (res && res[0] === true) {
            resolve()
          } else {
            reject(new Error('sync stack error'))
          }
        })
        .catch((error) => {
          reject(error)
        })
    })
  }
  // TTS模块
  app.tts = {
    speak: function (text, cb) {
      self.adapter.ttsMethod('speak', [appId, text])
        .then((args) => {
          // 返回的参数是一个数组，按顺序
          logger.log('tts register', args[0])
          self.ttsCallback['ttscb:' + args[0]] = cb.bind(app)
        })
        .catch((err) => {
          logger.error(err)
        })
    },
    stop: function (cb) {
      self.adapter.ttsMethod('stop', [appId])
        .then((args) => {
          cb.call(app, null)
        })
        .catch((err) => {
          cb.call(app, err)
        })
    }
  }
  // media模块
  var media = new EventEmitter()
  app.media = Object.assign(media, {
    start: function (url, cb) {
      self.adapter.multiMediaMethod('start', [appId, url])
        .then((result) => {
          self.multiMediaCallback['mediacb:' + result[0]] = function (args) {
            media.emit.apply(media, args)
          }
        })
    },
    pause: function (cb) {
      self.adapter.multiMediaMethod('pause', [appId])
    },
    resume: function (cb) {
      self.adapter.multiMediaMethod('resume', [appId])
    },
    stop: function (cb) {
      self.adapter.multiMediaMethod('stop', [appId])
    },
    getPosition: function () {
      return new Promise((resolve, reject) => {
        self.adapter.multiMediaMethod('getPosition', [appId])
          .then((res) => {
            if (res && res[0] >= -1) {
              resolve(res[0])
            } else {
              reject(new Error('player instance not found'))
            }
          })
          .catch((error) => {
            reject(error)
          })
      })
    },
    getLoopMode: function () {
      return new Promise((resolve, reject) => {
        self.adapter.multiMediaMethod('getLoopMode', [appId])
          .then((res) => {
            if (res && res[0] !== undefined) {
              resolve(res[0])
            } else {
              reject(new Error('multimediad error'))
            }
          })
          .catch((error) => {
            reject(error)
          })
      })
    },
    setLoopMode: function (mode) {
      return new Promise((resolve, reject) => {
        mode = mode === true ? 'true' : 'false'
        self.adapter.multiMediaMethod('setLoopMode', [appId, mode])
          .then((res) => {
            if (res && res[0] !== undefined) {
              resolve(res[0])
            } else {
              reject(new Error('multimediad error'))
            }
          })
          .catch((error) => {
            reject(error)
          })
      })
    },
    seek: function (position) {
      if (typeof pos !== 'number') {
        return Promise.reject(new Error('position must be a number'))
      }
      return new Promise((resolve, reject) => {
        self.adapter.multiMediaMethod('seek', [appId, '' + position])
          .then((res) => {
            if (res && res[0] === true) {
              resolve()
            } else {
              reject(new Error('player instance not found'))
            }
          })
          .catch((error) => {
            reject(error)
          })
      })
    }
  })
  app.light = {
    play: function (uri, args) {
      var argString = JSON.stringify(args || {})
      var absPath = pathTransform(uri, LIGHT_SOURCE, self.appHome + '/light')
      return new Promise((resolve, reject) => {
        self.adapter.lightMethod('play', [appId, absPath, argString])
          .then((res) => {
            if (res && res[0] === true) {
              resolve()
            } else {
              reject(new Error('lighting effect throw an error'))
            }
          })
          .catch((error) => {
            reject(error)
          })
      })
    },
    stop: function () {
      return self.adapter.lightMethod('stop', [appId])
    }
  }
  app.playSound = function (uri) {
    var absPath = pathTransform(uri, MEDIA_SOURCE, self.appHome + '/media')
    return self.adapter.lightMethod('appSound', [appId, absPath])
  }
  app.localStorage = {
    getItem: function (key) {
      return property.get(key)
    },
    setItem: function (key, value) {
      return property.set(key, value)
    }
  }
  if (preload === true) {
    this.preload = true
    setTimeout(() => {
      app.emit('ready')
    })
    return app
  }
  // 注册extApp
  this.adapter.register(appId)
    .then(() => {
      // 注册成功事件
      app.emit('ready')
    })
    .catch((err) => {
      // 注册失败事件
      app.emit('error', err)
    })
  return app
}

/**
 * 事件分发
 * @param {string} name 事件名字
 * @param {object[]} args 事件参数
 */
ExtAppService.prototype.onEvent = function onEvent (name, args) {
  // 判断是否注册了appId
  try {
    switch (name) {
      // 下面是extapp的生命周期事件，抛给app处理
      case 'onCreate':
        this.apps[args[0]].emit('created')
        break
      case 'onPause':
        this.apps[args[0]].emit('paused')
        break
      case 'onResume':
        this.apps[args[0]].emit('resumed')
        break
      case 'nlp':
        this.apps[args[0]].emit('onrequest', JSON.parse(args[1]), JSON.parse(args[2]))
        break
      case 'onDestroy':
        this.apps[args[0]].emit('destroyed')
        if (this.preload === true) {
          process.exit(0)
        }
        break
      case 'keyEvent':
        this.apps[args[0]].emit('keyEvent', args.slice(0))
        break
      case 'ready':
        // extapp 注册成功事件
        this.apps[args[0]].emit('ready')
        break
      case 'error':
        // extapp 注册失败事件
        this.apps[args[0]].emit('error', args[1])
        break
      default:
        // 其它事件抛给extapp框架去处理
        console.log('default emit:', name, args)
        this.emit(name, args)
        break
    }
  } catch (error) {
    this.emit('error', error)
  }
}

/**
 * 接收vui系统事件
 * @param {string} name
 * @param {string[]} args
 */
ExtAppService.prototype.onVuiEvent = function (name, args) {
  switch (name) {
    case 'ready':
      this.emit('restart', args)
      break
    default:
      this.emit(name, args)
      break
  }
}

/**
 * 处理extapp框架需要处理的event
 */
ExtAppService.prototype.handleEvent = function () {
  // TTS完成事件
  this.on('onTtsComplete', (args) => {
    this.emit('tts:complete:' + args[0])
  })
  // media完成事件
  this.on('onMediaComplete', (args) => {
    this.emit('audio:complete:' + args[0])
  })
  // vui重启事件
  this.on('restart', (args) => {

  })
}

module.exports = ExtAppService
