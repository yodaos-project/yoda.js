var logger = require('logger')('custom-config-runtime')
var config = require('/etc/yoda/custom-config.json')
var querystring = require('querystring')

var testWakeupSoundEffects = {
  action: 'open',
  type: '1',
  value: [{
    wakeupId: 'de152fdc-1ad7-43dc-85d9-6bc279baa459',
    voiceId: '',
    wakeupUrl: 'http://10.88.2.29:5000/awake_04.wav'
  }]
}

class CustomConfig {
  constructor (runtime) {
    this.runtime = runtime
  }
  /**
   * Handling the configs from RokidApp, includes activation words, night mode, and etc..
   * @param {string} message
   */
  onCustomConfig (message) {
    var appendUrl = (pathname, params) => {
      var obj
      if (typeof params === 'string') {
        obj = {param: params}
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
    if (msg.nightMode) {
      this.runtime.dndMode.setOption(msg.nightMode)
      delete msg.nightMode
    }
    msg.wakeupSoundEffects = JSON.stringify(testWakeupSoundEffects)
    logger.error(`${JSON.stringify(testWakeupSoundEffects)}`)
    for (var field in msg) {
      if (msg.hasOwnProperty(field) && config.hasOwnProperty(field)) {
        var conf = config[field]
        var value = msg[field]
        logger.error(`${JSON.stringify(value)}`)
        if (!conf.appOption || !conf.dataType) {
          logger.warn(`custom-config.json has invalid field [${field}]`)
          continue
        }
        if (conf.dataType === 'object') {
          this.runtime.openUrl(appendUrl(field, value, conf.appOption))
        } else if (conf.dataType === 'array') {
          if (conf.arrayIndex && typeof conf.arrayIndex === 'number') {
            this.runtime.openUrl(appendUrl(field, value[conf.arrayIndex], conf.appOption))
          } else {
            this.runtime.openUrl(appendUrl(field, value, conf.appOption))
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
