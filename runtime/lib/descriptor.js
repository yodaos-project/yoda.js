class Descriptor {
  constructor (runtime, name) {
    this.runtime = runtime
    this.component = runtime.component
    this.descriptor = runtime.descriptor
    this.namespace = name
  }

  emitToApp (appId, event, args) {
    var bridge = this.component.appScheduler.getAppById(appId)
    if (bridge == null) {
      return Promise.reject(new Error(`Trying to send life cycle '${event}' to app '${appId}', yet it's not created.`))
    }
    bridge.emit(this.namespace, event, args)
  }
}

module.exports = Descriptor
