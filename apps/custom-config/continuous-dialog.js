'use strict'
var property = require('@yoda/property')
var BaseConfig = require('./base-config')

var SWITCH_OPEN = 'open'
var SWITCH_CLOSE = 'close'

var PICKUP_SWITCH_OPEN = '当前不支持连续对话'
var PICKUP_SWITCH_CLOSE = '当前不支持连续对话'
var CONFIG_FAILED = '设置失败'

class ContinuousDialog extends BaseConfig {
  getIntentMap () {
    return {
      pickupswitch: this.applyPickupSwitch.bind(this)
    }
  }

  getUrlMap () {
    return {
      continuousDialog: this.onPickupSwitchStatusChanged.bind(this)
    }
  }

  onPickupSwitchStatusChanged (queryObj) {
    if (queryObj) {
      this.applyPickupSwitch(queryObj.action, queryObj.isFirstLoad)
    }
  }

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
