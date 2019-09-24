'use strict'

var extapp = require('./ext-helper')

var target = process.argv[2]
var descriptorPath = process.argv[3]

extapp.main(target, descriptorPath)
