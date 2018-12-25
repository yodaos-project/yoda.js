var logger = require('logger')('custom-config-runtime')
var config = require('/etc/yoda/custom-config.json')

class CustomConfig {
  constructor (runtime) {
    this.runtime = runtime
  }
  /**
   * Handling the configs from RokidApp, includes activation words, night mode, and etc..
   * @param {string} message
   * @private
   */
  onCustomConfig (message) {
    var appendUrl = (pathname, params) => {
      var url = `yoda-skill://custom-config/${pathname}?`
      var queryString = (params) => {
        var query = ''
        for (var key in params) {
          var value = params[key]
          query += `&${key}=${value}`
        }
        url += query
        return url
      }
      return queryString(params)
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
    for (var i = 0; i < config.length; ++i) {
      if (config[i].configName && msg[config[i].configName]) {
        if (config[i].dataType === 'object') {
          this.runtime.openUrl(appendUrl(config[i].configName, msg[config[i].configName]), config[i].appOption)
          break
        } else if (config[i].dataType === 'array') {
          if (config[i].arrayIndex !== undefined && typeof config[i].arrayIndex === 'number') {
            this.runtime.openUrl(appendUrl(config[i].configName,
              msg[config[i].configName][config[i].arrayIndex]), config[i].appOption)
            break
          } else {
            this.runtime.openUrl(appendUrl(config[i].configName, msg[config[i].configName]), config[i].appOption)
            break
          }
        }
      }
    }
  }

  onLoadCustomConfig (config) {
    if (config === undefined) {
      return
    }
    this.runtime.openUrl(`yoda-skill://custom-config/firstLoad?config=${config}`)
  }
}

module.exports = CustomConfig
