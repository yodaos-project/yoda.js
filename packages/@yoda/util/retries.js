'use strict'

module.exports.retries = retries

function retries (maxRetry, thisArg, action) {
  var retry = maxRetry || 1
  var argLen = arguments.length
  var lastly = false
  if (argLen === 2) {
    action = thisArg
  }
  var tryAction = function () {
    retry--
    if (retry <= 0) {
      lastly = true
    }
    if (argLen > 2) {
      return action.call(thisArg, tryAction, lastly)
    } else {
      return action(tryAction, lastly)
    }
  }
  return tryAction()
}
