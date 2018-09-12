var Service = require('../service')
var Light = require('@yoda/light')

console.log(JSON.stringify(Light.getProfile()))

var light = new Service()

light.setWelcome()
