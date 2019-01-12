'use strict'
var property = require('@yoda/property')
var BaseConfig = require('./base-config')
var logger = require('logger')('custom-config-continuous-dialog')

/**
 * continuous dialog handler
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
    if (queryObj) {
      this.applyPickupSwitch(false, queryObj.action, queryObj.isFirstLoad)
    }
  }

  /**
   * handler of intent
   * @param {boolean} isFromIntent
   * @param {string} action
   * @param {boolean} isFirstLoad
   */
  applyPickupSwitch (isFromIntent, action, isFirstLoad) {
    if (action) {
      property.set('sys.pickupswitch', action, 'persist')
      if (!isFirstLoad) {
        if (this.tts.hasOwnProperty(action)) {
          if (isFromIntent) {
            this.activity.tts.speak(this.tts[action]).then(() => {
              return this.activity.httpgw.request(
                '/v1/device/deviceManager/addOrUpdateDeviceInfo',
                {
                  namespace: 'custom_config',
                  values: {
                    continuousDialog: `{"action":"${action}"}`
                  }
                },
                {})
            }).then((data) => {
              this.activity.exit()
            }).catch((err) => {
              logger.warn(`request cloud api error: ${err}`)
              this.activity.exit()
            })
          } else {
            this.activity.tts.speak(this.tts[action]).then(() => this.activity.exit())
          }
        } else {
          this.activity.tts.speak(this.tts.error).then(() => this.activity.exit())
        }
      }
    }
  }
}

module.exports = ContinuousDialog
