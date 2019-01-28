var EventEmitter = require('events')

class ContextManager extends EventEmitter {
  constructor (activity) {
    super()
    this.activity = activity

    this.__ctxId = 0
    this.contexts = []

    this.status = 'pending'
    ;['create', 'active', 'pause', 'resume', 'background'].forEach(status => {
      this.activity.on(status, this.onLifeCycle.bind(this, status))
    })

    this.activity.on('request', this.onRequest.bind(this))
  }

  exit (ctx) {
    var idx = this.contexts.indexOf(ctx.id)
    if (idx < 0) {
      return Promise.resolve()
    }
    this.contexts.splice(idx, 1)
    if (this.contexts.length > 0) {
      return Promise.resolve()
    }
    return this.activity.exit()
  }

  onLifeCycle (status) {
    this.status = status
  }

  onRequest (nlp, action) {
    var ctx = this.constructContext('request', { nlp: nlp, action: action })
    this.emit('request', ctx)
  }

  constructContext (type, fields) {
    var ctx = Object.assign({}, fields, {
      type: type,
      id: ++this.__ctxId,
      exit: () => {
        this.exit(ctx)
      }
    })
    this.contexts.push(ctx.id)
    return ctx
  }
}

module.exports = ContextManager
