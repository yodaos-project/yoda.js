'use strict'

var fs = require('fs')
var path = require('path')
var configPath = path.join(__dirname, '../config.json')
var configObj = {}

;(function checkAndLoad () {
  var exists = fs.existsSync(configPath)
  if (exists) {
    try {
      configObj = JSON.parse(fs.readFileSync(configPath))
    } catch (err) {
      console.error('invalid .testrc profile defined')
    }
  }
})()

module.exports = configObj
