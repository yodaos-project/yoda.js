'use strict'

var test = require('tape')
var EventEmitter = require('events').EventEmitter
var helper = require('../../helper')

var AppRuntime = require(`${helper.paths.runtime}/lib/app-runtime`)
var Lifetime = require(`${helper.paths.runtime}/lib/component/lifetime`)

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

  var appT = function (appId) {
    return {
      create: function () {
        return Promise.resolve(appI[appId])
      },
      destruct: function () {
        return Promise.resolve()
      }
    }
  }

  var apps = {
    testSceneCreate: appT('testSceneCreate'),
    testSceneDestroy: appT('testSceneDestroy'),
    testCutInterrupt: appT('testCutInterrupt')
  }

  var runtime = new AppRuntime()
  runtime.apps = apps
  runtime.life = new Lifetime(apps)

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

    // test scene resume
    runtime.life.deactivateAppById('testCutInterrupt')
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
