var EventEmitter = require('events')

/**
 * @typedef {Context}
 */

class ContextManager extends EventEmitter {
  constructor (activity) {
    super()
    this.activity = activity

    this.__ctxId = 0
    this.contexts = []

    this.status = 'pending'
    ;['create', 'destroy', 'active', 'pause', 'resume', 'background'].forEach(status => {
      this.activity.on(status, this.onLifeCycle.bind(this, status))
    })
    ;['destroy', 'background'].forEach(it => {
      this.activity.on(it, this.clearContexts.bind(this))
    })

    this.activity.on('request', this.onRequest.bind(this))
    this.activity.on('url', this.onUrl.bind(this))
  }

  /**
   * @public
   * @param {Context} ctx -
   * @param {any[]} args - arguments to `activity.exit`
   */
  exit (ctx, args) {
    var idx = this.contexts.indexOf(ctx.id)
    if (idx < 0) {
      return Promise.resolve()
    }
    this.contexts.splice(idx, 1)
    if (this.contexts.length > 0) {
      return Promise.resolve()
    }
    return this.activity.exit.apply(this.activity, args)
  }

  /**
   * @private
   * @param {string} status
   */
  onLifeCycle (status) {
    this.status = status
  }

  /**
   * @private
   */
  clearContexts () {
    this.contexts = []
  }

  /**
   * @private
   */
  onRequest (nlp, action) {
    var ctx = this.constructContext('request', { nlp: nlp, action: action })
    this.emit('request', ctx)
  }

  /**
   * @private
   */
  onUrl (urlObj) {
    var ctx = this.constructContext('url', { urlObj: urlObj })
    this.emit('url', ctx)
  }

  /**
   * @private
   */
  constructContext (type, fields) {
    var self = this
    var ctx = Object.assign({}, fields, {
      type: type,
      id: ++self.__ctxId,
      exit: function () {
        self.exit(ctx, arguments)
      }
    })
    self.contexts.push(ctx.id)
    return ctx
  }
}

module.exports = ContextManager
