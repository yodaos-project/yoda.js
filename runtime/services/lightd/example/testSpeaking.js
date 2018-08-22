var Service = require('../service')
var Light = require('light')
var MediaPlayer = require('multimedia').MediaPlayer
var Effects = require('../effects')

console.log(JSON.stringify(Light.getProfile()))

var effect = new Effects(Light, MediaPlayer)

var light = new Service({
  effect: effect
})

light.setSpeaking()
