'use strict'

var test = require('tape')
var _ = require('@yoda/util')._
var helper = require('../helper')
var Descriptors = require(`${helper.paths.runtime}/lib/descriptor`)

var ActivityDescriptor = Descriptors.ActivityDescriptor
var MultimediaDescriptor = Descriptors.MultimediaDescriptor

test('should serialize namespace fields', t => {
  var descriptor = new ActivityDescriptor('@test', '/foobar', {})
  var serialized = JSON.stringify(descriptor)
  var deserialized = JSON.parse(serialized)

  var activityEvents = Object.keys(ActivityDescriptor.prototype).filter(key => {
    var desc = ActivityDescriptor.prototype[key]
    return desc.type === 'event'
  })
  var multimediaEvents = Object.keys(MultimediaDescriptor.prototype).filter(key => {
    var desc = MultimediaDescriptor.prototype[key]
    return desc.type === 'event'
  })

  activityEvents.forEach(it => {
    t.assert(deserialized[it] != null, `Key '${it}' should exists`)
  })
  t.assert(deserialized.media != null, 'MediaDescriptor should be serialized too')
  multimediaEvents.forEach(it => {
    t.assert(_.get(deserialized, `media.${it}`) != null, `Key 'media${it}' should exists`)
  })

  t.end()
})

test('should serialize value fields', t => {
  var descriptor = new ActivityDescriptor('@test', '/foobar', {})
  var serialized = JSON.stringify(descriptor)
  var deserialized = JSON.parse(serialized)

  ;['appId', 'appHome'].forEach(it => {
    t.assert(deserialized[it] != null, `Key '${it}' should exists`)
    t.strictEqual(deserialized[it].type, 'value', `Key '${it}' should be value type`)
    t.assert(deserialized[it].value != null, `Value of key '${it}' should exists`)
  })

  t.end()
})
