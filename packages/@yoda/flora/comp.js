var floraFactory = require('./index')

module.exports = Flora
function Flora (logger) {
  if (logger) {
    this.__logger = logger
  } else {
    this.__logger = {
      info: () => {},
      warn: () => {},
      error: () => {}
    }
  }
  this.__config = {}
  this.__cli = null
}

Flora.prototype.handlers = {}

/**
 * Initialize flora client.
 * @param {object} config
 */
Flora.prototype.init = function init (clientName, config) {
  this.__config = config
  this.__logger.info('start initializing flora client')
  var cli = floraFactory.connect(`${config.uri}#${clientName}`, config.bufsize)
  if (!cli) {
    this.__logger.warn('flora connect failed, try again after', config.reconnInterval, 'milliseconds')
    setTimeout(() => this.init(), config.reconnInterval)
    return
  }
  cli.on('recv_post', this.onRecvPost.bind(this))
  cli.on('disconnected', this.onDisconnect.bind(this))

  Object.keys(this.handlers).forEach(it => {
    cli.subscribe(it)
  })

  this.__cli = cli
}

Flora.prototype.destruct = function destruct () {
  if (this.__cli == null) {
    return
  }
  this.__cli.close()
}

/**
 * Flora recv_post channel message handler.
 *
 * @param {string} name
 * @param {string} type
 * @param {string} msg
 */
Flora.prototype.onRecvPost = function onRecvPost (name, type, msg) {
  var handler = this.handlers[name]
  if (handler == null) {
    this.__logger.error(`No handler found for ${name}`)
    return
  }
  handler.call(this, msg)
}

/**
 * Flora disconnection event handler.
 */
Flora.prototype.onDisconnect = function onDisconnect () {
  this.__logger.warn('flora disconnected, try reconnect')
  this.__cli.close()
  this.init()
}

/**
 * Post a message through flora.
 * @param {string} channel -
 * @param {FloraCaps} msg -
 * @param {FloraType} type -
 */
Flora.prototype.post = function post (channel, msg, type) {
  if (this.__cli == null) {
    return
  }
  if (type == null) {
    type = floraFactory.MSGTYPE_INSTANT
  }
  this.__cli.post(channel, msg, type)
}
