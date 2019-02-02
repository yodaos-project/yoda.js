'use strict'
var logger = require('logger')('custom-config-runtime')
var config = require('/etc/yoda/custom-config.json')
var querystring = require('querystring')
var safeParse = require('@yoda/util').json.safeParse
var EventEmitter = require('events')
var property = require('@yoda/property')

/**
 * handle all custom-config
 */
class CustomConfig extends EventEmitter {
  constructor (runtime) {
    super()
    this.runtime = runtime
    this.runtime.component.lifetime.on('eviction', (appId, form) => {
      if (form === 'cut' && property.get('persist.sys.pickupswitch') === 'open') {
        this.runtime.setPickup(true, 6000, false)
      }
    })
  }

  /**
   * intercept the configuration message for dnd-model etc
   * @param {string|object} msg
   */
  intercept (msg) {
    if (msg.nightMode) {
      if (typeof msg.nightMode === 'object') {
        this.runtime.component.dndMode.setOption(msg.nightMode)
        delete msg.nightMode
      } else if (typeof msg.nightMode === 'string') {
        var nightMode = safeParse(msg.nightMode)
        if (nightMode) {
          this.runtime.component.dndMode.setOption(nightMode)
        }
        delete msg.nightMode
      }
    }
  }

  /**
   * construct the skill url
   * @param {string} pathname - skill path
   * @param {object} params - skill prarms
   * @param {boolean} stringify - is the params should be stringify
   * @returns {string} url for custom-config skill
   */
  appendUrl (pathname, params, stringify) {
    var obj
    if (stringify) {
      obj = {param: JSON.stringify(params)}
    } else {
      obj = params
    }
    return `yoda-skill://custom-config/${pathname}?${querystring.stringify(obj)}`
  }
  /**
   * Handling the configs from RokidApp, includes activation words, night mode, and etc..
   * @param {string} message
   */
  onCustomConfig (message) {
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
    this.intercept(msg)
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
        this.runtime.openUrl(this.appendUrl(field, value, conf.stringify), conf.appOption)
      }
    }
  }

  /**
   * first load custom config
   * @param {string} config - custom config from cloud
   */
  onLoadCustomConfig (config) {
    if (config === undefined) {
      return
    }
    var configObj = safeParse(config)
    this.intercept(configObj)
    var sConfig = JSON.stringify(configObj)
    this.runtime.openUrl(`yoda-skill://custom-config/firstLoad?config=${sConfig}`,
      { preemptive: false })
  }

  /**
   * Interception system resume from sleep
   */
  runtimeDidResumeFromSleep () {
    return this.runtime.openUrl('yoda-skill://custom-config/reload',
      { preemptive: false })
  }
}

module.exports = CustomConfig
