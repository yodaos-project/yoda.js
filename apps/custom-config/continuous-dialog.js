'use strict'
var property = require('@yoda/property')
var BaseConfig = require('./base-config').BaseConfig

/**
 * continuous dialog handler
 * @extends BaseConfig
 */
class ContinuousDialog extends BaseConfig {
  constructor (activity) {
    super(activity)
    this.tts = {
      'open': '已开启连续对话',
      'close': '收到,已关闭',
      'error': '设置失败'
    }
  }
  /**
   * get intent map
   * @returns {object} - intent map
   */
  getIntentMap () {
    return {
      pickupswitch: this.applyPickupSwitch.bind(this, true)
    }
  }

  /**
   * get url map
   * @returns {object} - url map
   */
  getUrlMap () {
    return {
      continuousDialog: this.onPickupSwitchStatusChanged.bind(this)
    }
  }

  /**
   * handler of skill url
   * @param {object} queryObj
   */
  onPickupSwitchStatusChanged (queryObj) {
    if (queryObj && typeof queryObj.action === 'string') {
      return this.applyPickupSwitch(false, queryObj.action, queryObj.isFirstLoad)
    } else {
      return Promise.reject(new Error(`invalid queryObj ${JSON.stringify(queryObj)}`))
    }
  }

  /**
   * handler of intent
   * @param {boolean} isFromIntent
   * @param {string} action
   * @param {boolean} isFirstLoad
   * @return {promise}
   */
  applyPickupSwitch (isFromIntent, action, isFirstLoad) {
    if (action) {
      property.set('sys.pickupswitch', action, 'persist')
      if (!isFirstLoad) {
        if (this.tts.hasOwnProperty(action)) {
          if (isFromIntent) {
            return this.activity.tts.speak(this.tts[action]).then(() => {
              return this.activity.httpgw.request(
                '/v1/device/deviceManager/addOrUpdateDeviceInfo',
                {
                  namespace: 'custom_config',
                  values: {
                    continuousDialog: `{"action":"${action}"}`
                  }
                },
                {})
            })
          } else {
            return this.activity.tts.speak(this.tts[action])
          }
        } else {
          return this.activity.tts.speak(this.tts.error)
        }
      }
    } else {
      return Promise.reject(new Error(`invalid action ${action}`))
    }
  }
}

module.exports = ContinuousDialog
