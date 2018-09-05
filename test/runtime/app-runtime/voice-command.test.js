'use strict'

var test = require('tape')
var EventEmitter = require('events').EventEmitter
var AppRuntime = require('/usr/lib/yoda/runtime/lib/app-runtime.js')

test('test onVoiceCommand', (t) => {
  AppRuntime.prototype.startDbusAppService = function () {}
  AppRuntime.prototype.handleMqttMessage = function () {}
  AppRuntime.prototype.listenDbusSignals = function () {}
  AppRuntime.prototype.loadApp = function () {}

  var destroyAll = AppRuntime.prototype.destroyAll
  AppRuntime.prototype.destroyAll = function destroyAllProxy () {
    return destroyAll.call(this, { resetServices: false })
  }

  var testSceneCreate = new EventEmitter()
  var testSceneDestroy = new EventEmitter()
  var testCutInterrupt = new EventEmitter()

  var appI = {
    testSceneCreate: testSceneCreate,
    testSceneDestroy: testSceneDestroy,
    testCutInterrupt: testCutInterrupt
  }

  var appT = {
    create: function (appId) {
      return Promise.resolve(appI[appId])
    },
    destruct: function () {}
  }

  var apps = {
    testSceneCreate: appT,
    testSceneDestroy: appT,
    testCutInterrupt: appT
  }

  var runtime = new AppRuntime()
  runtime.apps = apps

  t.plan(9)

  testSceneCreate.on('create', () => {
    t.pass('@testSceneCreate create')
  })
  testSceneCreate.on('request', () => {
    t.pass('@testSceneCreate should be request')

    // test scene destroy
    runtime.onVoiceCommand('', {
      appId: 'testSceneDestroy',
      cloud: false
    }, {
      response: {
        action: {
          form: 'scene'
        }
      }
    })
  })
  testSceneCreate.on('destroy', () => {
    t.pass('@testSceneCreate should be destroy')
  })

  testSceneDestroy.on('create', () => {
    t.pass('@testSceneDestroy should be create')
  })
  testSceneDestroy.on('request', () => {
    t.pass('@testSceneDestroy should be request')

    // // test cut interrupt
    runtime.onVoiceCommand('', {
      appId: 'testCutInterrupt',
      cloud: false
    }, {
      response: {
        action: {
          form: 'cut'
        }
      }
    })
  })
  testSceneDestroy.on('pause', () => {
    t.pass('@testSceneDestroy should be pause')
  })
  testSceneDestroy.on('resume', () => {
    t.pass('@testSceneDestroy should be resume')
    runtime.destroy()
    t.end()
  })

  testCutInterrupt.on('create', () => {
    t.pass('@testCutInterrupt should be create')
  })
  testCutInterrupt.on('request', () => {
    t.pass('@testCutInterrupt should be request')

    // // test scene resume
    runtime.exitAppByIdForce('testCutInterrupt')
  })

  // test scene create
  runtime.onVoiceCommand('', {
    appId: 'testSceneCreate',
    cloud: false
  }, {
    response: {
      action: {
        form: 'scene'
      }
    }
  })
})
