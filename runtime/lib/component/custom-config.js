var logger = require('logger')('custom-config-runtime')
var config = require('/etc/yoda/custom-config.json')
var querystring = require('querystring')
var safeParse = require('@yoda/util').json.safeParse

class CustomConfig {
  constructor (runtime) {
    this.runtime = runtime
  }

  /**
   * interce the configuration message for dnd-model etc
   * @param msg
   */
  interce (msg) {
    logger.info(`interce ${JSON.stringify(msg)}`)
    if (msg.nightMode) {
      if (typeof msg.nightMode === 'object') {
        this.runtime.dndMode.setOption(msg.nightMode)
        delete msg.nightMode
      } else if (typeof msg.nightMode === 'string') {
        var nightMode = safeParse(msg.nightMode)
        if (nightMode) {

          this.runtime.dndMode.setOption(nightMode)
        }
        delete msg.nightMode
      }
    }
  }

  /**
   * Handling the configs from RokidApp, includes activation words, night mode, and etc..
   * @param {string} message
   */
  onCustomConfig (message) {
    var appendUrl = (pathname, params, stringify) => {
      var obj
      if (stringify) {
        obj = {param: JSON.stringify(params)}
      } else {
        obj = params
      }
      return `yoda-skill://custom-config/${pathname}?${querystring.stringify(obj)}`
    }
    var msg = null
    try {
      if (typeof message === 'object') {
        msg = message
      } else if (typeof message === 'string') {
        msg = JSON.parse(message)
      }
    } catch (err) {
      logger.error(err)
      return
    }
    this.interce(msg)
    for (var field in msg) {
      if (msg.hasOwnProperty(field) && config.hasOwnProperty(field)) {
        var conf = config[field]
        var value
        value = msg[field]
        if (!conf.appOption || !conf.dataType) {
          logger.warn(`custom-config.json has invalid field [${field}]`)
          continue
        }
        logger.info(`open url: ${field}`)
        this.runtime.openUrl(appendUrl(field, value, conf.stringify),conf.appOption)
      }
    }
  }

  /**
   * first load custom config
   * @param {string} config - cunstom config from cloud
   */
  onLoadCustomConfig (config) {
    if (config === undefined) {
      return
    }
    var configObj = safeParse(config)
    this.interce(configObj)
    var sConfig = JSON.stringify(configObj)
    this.runtime.openUrl(`yoda-skill://custom-config/firstLoad?config=${sConfig}`)
  }
}

module.exports = CustomConfig
