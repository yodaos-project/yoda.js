'use strict'
var property = require('@yoda/property')
var BaseConfig = require('./base-config').BaseConfig
var logger = require('logger')('custom-config-standby')

var STANDBY_LIGHT_JS = 'system://setSysStandby.js'
var SWITCH_OPEN = 'open'
var SWITCH_CLOSE = 'close'

/**
 * standby light handler
 * @extends BaseConfig
 */
class StandbyLight extends BaseConfig {
  constructor (activity) {
    super(activity)
    this.initStandbyLight()
    this.tts = {
      'open': '灯光已开启',
      'close': '灯光已关闭',
      'error': '设置失败'
    }
  }

  /**
   * get intent map
   * @returns {object} intent map
   */
  getIntentMap () {
    return {
      lightswitch: this.applyStandbyLightSwitch.bind(this, true)
    }
  }

  /**
   * get url map
   * @returns {object} url map
   */
  getUrlMap () {
    return {
      standbyLight: this.onStandbyLightSwitchStatusChanged.bind(this)
    }
  }
  reload () {
    this.initStandbyLight()
  }
  /**
   * init the standby light
   */
  initStandbyLight () {
    var switchValue = property.get('persist.sys.standbylightswitch')
    if (switchValue === SWITCH_OPEN) {
      this.activity.light.play(STANDBY_LIGHT_JS, {}, { shouldResume: true })
    } else {
      this.activity.light.stop(STANDBY_LIGHT_JS)
    }
  }

  /**
   * handler of the skill url
   * @param {object} queryObj
   */
  onStandbyLightSwitchStatusChanged (queryObj) {
    if (queryObj && typeof queryObj.action === 'string') {
      return this.applyStandbyLightSwitch(false, queryObj.action, queryObj.isFirstLoad)
    } else {
      return Promise.reject(new Error(`invalid queryObj ${JSON.stringify(queryObj)}`))
    }
  }

  /**
   * handler of the intent
   * @param {boolean} isFromIntent
   * @param {string} action
   * @param {boolean} isFirstLoad
   */
  applyStandbyLightSwitch (isFromIntent, action, isFirstLoad) {
    if (action === SWITCH_OPEN || action === SWITCH_CLOSE) {
      property.set('sys.standbylightswitch', action, 'persist')
      if (action === SWITCH_OPEN) {
        logger.info('standby light turned on')
        this.activity.light.play(STANDBY_LIGHT_JS, {}, {shouldResume: true})
      } else if (action === SWITCH_CLOSE) {
        logger.info('standby light turned off')
        this.activity.light.stop(STANDBY_LIGHT_JS)
      }
      if (!isFirstLoad) {
        if (this.tts.hasOwnProperty(action)) {
          if (isFromIntent) {
            return this.activity.tts.speak(this.tts[action]).then(() => {
              return this.activity.httpgw.request(
                '/v1/device/deviceManager/addOrUpdateDeviceInfo',
                {
                  namespace: 'custom_config',
                  values: {
                    standbyLight: `{"action":"${action}"}`
                  }
                }, {})
            })
          } else {
            return this.activity.tts.speak(this.tts[action])
          }
        } else {
          return this.activity.tts.speak(this.tts.error)
        }
      } else {
        return Promise.resolve()
      }
    } else {
      return Promise.reject(new Error(`invalid action: ${action}`))
    }
  }
}

module.exports = StandbyLight
