'use strict'

var test = require('tape')
var EventEmitter = require('events').EventEmitter

var AppRuntime = require('/usr/lib/yoda/runtime/lib/app-runtime.js')

test('test onVoiceCommand', (t) => {
  AppRuntime.prototype.startExtappService = function () {}
  AppRuntime.prototype.handleMqttMessage = function () {}
  AppRuntime.prototype.listenDbusSignals = function () {}
  AppRuntime.prototype.loadApp = function () {}

  AppRuntime.prototype.destroyAll = function () {
    var i = 0
    // destroy all foreground app
    for (i = 0; i < this.appIdStack.length; i++) {
      if (this.appMap[this.appIdStack[i]]) {
        this.appMap[this.appIdStack[i]].emit('destroy')
      }
    }
    // destroy all background app
    for (i = 0; i < this.bgAppIdStack.length; i++) {
      if (this.appMap[this.bgAppIdStack[i]]) {
        this.appMap[this.bgAppIdStack[i]].emit('destroy')
      }
    }

    this.appIdStack = []
    this.bgAppIdStack = []
    this.cloudAppIdStack = []
    this.appMap = {}
    this.appDataMap = {}
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
    }
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
  testSceneCreate.on('onrequest', () => {
    t.pass('@testSceneCreate should be onrequest')

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
  testSceneDestroy.on('onrequest', () => {
    t.pass('@testSceneDestroy should be onrequest')

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
    t.end()
  })

  testCutInterrupt.on('create', () => {
    t.pass('@testCutInterrupt should be create')
  })
  testCutInterrupt.on('onrequest', () => {
    t.pass('@testCutInterrupt should be onrequest')

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
