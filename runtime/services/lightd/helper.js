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

module.exports.getMaxLayer = getMaxLayer
function getMaxLayer (LayerDefine, maxSystemspaceLayers) {
  var layers = 0
  // find max layer from layerDefine
  Object.keys(LayerDefine).forEach((key) => {
    if (LayerDefine[key] > layers) {
      layers = LayerDefine[key]
    }
  })
  if (layers + 1 > maxSystemspaceLayers) {
    layers = maxSystemspaceLayers
  } else {
    layers = layers + 1
  }
  return layers
}
