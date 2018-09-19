'use strict'

var fs = require('fs')
var path = require('path')
var TapParser = require('tap-parser')
var resultRoot = path.join(__dirname, '../../test/.result')

var result = fs.readdirSync(resultRoot).reduce((result, filename) => {
  var parser = new TapParser()
  var currMsg
  parser.on('comment', (msg) => {
    msg = msg.replace(/^# /, '').replace('\n', '')
    currMsg = msg
  })
  parser.on('assert', (data) => {
    if (!currMsg) {
      return
    }
    result.total += 1
    data.ok ? result.pass += 1 : result.fail += 1
    if (!data.ok) {
      result.tests.push({
        filename: filename,
        testcase: currMsg,
        assert: data
      })
    }
  })
  var contents = fs.readFileSync(`${resultRoot}/${filename}`)
  parser.write(contents)
  return result
}, {
  pass: 0,
  fail: 0,
  total: 0,
  tests: []
})

console.log(JSON.stringify(result, null, 2))
