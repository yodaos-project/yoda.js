var Logger = require('logger')

class BridgeError extends Error {
  constructor (message) {
    super(message)
    this.name = 'BridgeError'
  }
}

class AppBridge {
  constructor (runtime, appId, metadata) {
    this.runtime = runtime
    this.appId = appId
    this.metadata = metadata
    this.logger = Logger(`bridge-${appId}`)

    this.subscriptionTable = {}
    this.suspended = false
    this.exited = false
  }

  emit (namespace, name, args) {
    namespace = namespace || 'activity'
    var eventStr = `${namespace}.${name}`
    var listener = this.subscriptionTable[eventStr]
    if (typeof listener === 'function') {
      listener.apply(global, args)
    }
  }

  subscribe (namespace, name, listener) {
    namespace = namespace || 'activity'
    var eventStr = `${namespace}.${name}`
    this.logger.debug(`Received subscription: ${eventStr}`)
    if (this.subscriptionTable[eventStr]) {
      this.logger.debug(`Event '${eventStr}' has already been subscribed, skipping.`)
      return
    }

    this.subscriptionTable[eventStr] = listener
  }

  invoke (namespace, method, params) {
    namespace = namespace || 'activity'
    var methodStr = `${namespace}.${method}`

    var descriptor = this.runtime.descriptor[namespace]
    if (descriptor == null) {
      return Promise.reject(new BridgeError(`Unknown namespace '${namespace}' been invoked`))
    }
    var fn = descriptor[method]
    if (typeof fn !== 'function') {
      return Promise.reject(new BridgeError(`Unknown method '${methodStr}' been invoked`))
    }
    // TODO: metadata check
    return Promise.resolve().then(() => fn.call(descriptor, this.getContext({ args: params })))
      .catch(e => {
        console.error(`Unexpected error on invoke '${methodStr}': ${e.stack}`)
        throw e
      })
  }

  getContext (fields) {
    return Object.assign({}, fields, {
      appId: this.appId
    }, this.metadata)
  }

  exit (code, signal) {
    if (this.exited) {
      this.logger.warn(`app(${this.appId}) might have been exited multiple times.`)
      return
    }
    this.exited = true
    this.onExit(code, signal)
  }

  suspend () {
    if (this.suspended) {
      return
    }
    this.suspended = true
    if (this.exited) {
      return
    }
    this.onSuspend()
  }

  onExit (code, signal) {}
  onSuspend () {}
}

module.exports = AppBridge
