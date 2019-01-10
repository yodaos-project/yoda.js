'use strict'
var property = require('@yoda/property')
var BaseConfig = require('./base-config')

var SWITCH_OPEN = 'open'
var SWITCH_CLOSE = 'close'

var PICKUP_SWITCH_OPEN = '已开启连续对话'
var PICKUP_SWITCH_CLOSE = '收到,已关闭'
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
      pickupswitch: this.applyPickupSwitch.bind(this)
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
      this.applyPickupSwitch(queryObj.action, queryObj.isFirstLoad)
    }
  }

  /**
   * handler of intent
   * @param action
   * @param isFirstLoad
   */
  applyPickupSwitch (action, isFirstLoad) {
    if (action) {
      property.set('sys.pickupswitch', action, 'persist')
      if (!isFirstLoad) {
        if (action === SWITCH_OPEN) {
          this.activity.tts.speak(PICKUP_SWITCH_OPEN).then(() => this.activity.exit())
        } else if (action === SWITCH_CLOSE) {
          this.activity.tts.speak(PICKUP_SWITCH_CLOSE).then(() => this.activity.exit())
        } else {
          this.activity.tts.speak(CONFIG_FAILED).then(() => this.activity.exit())
        }
      }
    }
  }
}

module.exports = ContinuousDialog
