'use strict'

require('@yoda/oh-my-little-pony')
var extapp = require('./ext-helper')

var target = process.argv[2]

extapp.main(target)
