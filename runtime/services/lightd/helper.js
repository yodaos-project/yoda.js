'use strict'

module.exports.delegateEvents = delegateEvents
function delegateEvents (source, dest) {
  source.__delegatedEvents__ = {}
  dest.on('newListener', (eventName) => {
    if (source.__delegatedEvents__[eventName]) {
      return
    }
    source.__delegatedEvents__[eventName] = true
    source.on(eventName, function () {
      dest.emit.apply(eventName, arguments)
    })
  })
}
