'use strict'

var test = require('tape')
var AppRuntime = require('@yoda/mock/lib/mock-app-runtime')
var helper = require('../helper')
var Permission = require(`${helper.paths.runtime}/lib/component/permission`)

test('sounds check', function (t) {
  var runtime = new AppRuntime()
  var permission = new Permission(runtime)
  permission.toString()
  t.end()
})
