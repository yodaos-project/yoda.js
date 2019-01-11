'use strict'
var property = require('@yoda/property')
var BaseConfig = require('./base-config')
var logger = require('logger')('custom-config-continuous-dialog')

var SWITCH_OPEN = 'open'
var SWITCH_CLOSE = 'close'

var PICKUP_SWITCH_OPEN = '当前不支持连续对话'
var PICKUP_SWITCH_CLOSE = '当前不支持连续对话'
var CONFIG_FAILED = '设置失败'

/**
 * continuous dialog handler
 */
class ContinuousDialog extends BaseConfig {
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
        var tts = ''
        switch (action) {
          case SWITCH_OPEN:
            tts = PICKUP_SWITCH_OPEN
            break
          case SWITCH_CLOSE:
            tts = PICKUP_SWITCH_CLOSE
            break
          default:
            tts = CONFIG_FAILED
        }
        this.activity.tts.speak(tts).then(() => {
          if ((action === SWITCH_CLOSE || action === SWITCH_OPEN) && isFromIntent) {
            this.activity.httpgw.request('/v1/device/deviceManager/addOrUpdateDeviceInfo',
              {namespace: 'custom_config', values: {continuousDialog: `{"action":"${action}"}`}}, {}).then((data) => {
              this.activity.exit()
            }).catch((err) => {
              logger.warn(`request cloud api error: ${err}`)
              this.activity.exit()
            })
          } else {
            this.activity.exit()
          }
        })
      }
    }
  }
}

module.exports = ContinuousDialog
