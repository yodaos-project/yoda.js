'use strict'

var test = require('tape')
var logger = require('logger')('blutooth-test')
var flora = require('@yoda/flora')
var bluetooth = require('@yoda/bluetooth')

var targets = [
  require('./a2dp-sink-test'),
  require('./a2dp-source-test'),
  require('./hfp-test')
]
targets.forEach(target => {
  test(`Start test bluetooth ${target.subject} interfaces:`, (t) => {
    var testIndex = 0
    var cmdIndex = 0
    var mockService = new flora.Agent(target.ipcUrl)
    mockService.subscribe(target.eventName, (msg) => {
      logger.info('on received msg:' + msg)
      msg = JSON.parse(msg[0] + '')
      logger.info('decoded as object:', msg)
      checkAndLoopTest(msg)
    })
    mockService.start()

    var adapter = bluetooth.getAdapter(target.profile)
    target.testCases[testIndex].exec(adapter)

    function checkAndLoopTest (recvMsg) {
      if (testIndex < target.testCases.length) {
        var sendMsg = target.testCases[testIndex].sendMsg
        if (Array.isArray(sendMsg)) {
          if (cmdIndex < sendMsg.length) {
            sendMsg = sendMsg[cmdIndex]
            cmdIndex++
          }
          if (cmdIndex >= target.testCases[testIndex].sendMsg.length) {
            testIndex++
            cmdIndex = 0
          }
        } else {
          testIndex++
        }
        var keys = Object.keys(sendMsg)
        keys.forEach(key => {
          t.equal(recvMsg[key], sendMsg[key], `${key}: "${recvMsg[key]}" is equal`)
        })
      }
      if (testIndex >= target.testCases.length) {
        mockService.close()
        adapter.destroy()
        t.end()
        logger.info(`End of bluetooth ${target.subject} interface test.`)
      } else if (cmdIndex === 0) {
        process.nextTick(() => {
          target.testCases[testIndex].exec(adapter)
        })
      }
    }
  })
})
