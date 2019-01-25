'use strict'

var test = require('tape')
var EventEmitter = require('events').EventEmitter
var helper = require('../../helper')

var AppRuntime = require(`${helper.paths.runtime}/lib/app-runtime`)

test.skip('test onVoiceCommand', (t) => {
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
        this.app = appI[appId]
        return Promise.resolve(appI[appId])
      },
      destruct: function () {
        return Promise.resolve()
      }
    }
  }

  var executors = {
    testSceneCreate: appT('testSceneCreate'),
    testSceneDestroy: appT('testSceneDestroy'),
    testCutInterrupt: appT('testCutInterrupt')
  }

  var runtime = new AppRuntime()
  runtime.loader.executors = executors
  runtime.loader.skillIdAppIdMap = {
    testSceneCreate: 'testSceneCreate',
    testSceneDestroy: 'testSceneDestroy',
    testCutInterrupt: 'testCutInterrupt'
  }

  t.plan(10)

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
  var resumed = false
  testSceneDestroy.on('resume', () => {
    t.pass('@testSceneDestroy should be resume')
    if (resumed) {
      runtime.deinit()
      t.end()
      return
    }
    resumed = true
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
