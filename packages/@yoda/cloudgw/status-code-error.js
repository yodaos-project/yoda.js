function StatusCodeError (status, body, res) {
  var instance = new Error(`Got status ${status} on request`)
  instance.status = status
  instance.body = body
  instance.res = res

  Object.setPrototypeOf(instance, Object.getPrototypeOf(this))
  Error.captureStackTrace(instance, StatusCodeError)
  return instance
}

Object.setPrototypeOf(StatusCodeError, Error)
StatusCodeError.prototype = Object.create(Error.prototype, {
  constructor: {
    value: Error,
    enumerable: false,
    writable: true,
    configurable: true
  }
})

module.exports = StatusCodeError
