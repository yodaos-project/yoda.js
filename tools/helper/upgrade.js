'use strict'

var fs = require('fs')
var system = require('@yoda/system')
var imgPathname = process.argv[2]

if (fs.existsSync(imgPathname) === false) {
  throw new Error(`${imgPathname} not exists`)
}

system.prepareOta(imgPathname)
system.reboot('tools/upgrade')
