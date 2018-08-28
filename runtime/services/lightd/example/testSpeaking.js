var Service = require('../service')
var Light = require('@yoda/light')
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var Effects = require('../effects')

console.log(JSON.stringify(Light.getProfile()))

var effect = new Effects(Light, MediaPlayer)

var light = new Service({
  effect: effect
})

light.setSpeaking()
