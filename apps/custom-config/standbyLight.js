'use strict'
var property = require('@yoda/property')
var BaseConfig = require('baseConfig')

var LIGHT_SWITCH_OPEN = '灯光已开启'
var LIGHT_SWITCH_CLOSE = '灯光已关闭'
var CONFIG_FAILED = '设置失败'

var STANDBY_LIGHT_JS = 'system://setSysStandby.js'
var SWITCH_OPEN = 'open'
var SWITCH_CLOSE = 'close'

class StandbyLight extends BaseConfig {
  constructor (activity, floraAgent, cloudgw) {
    super(activity, floraAgent, cloudgw)
    this.initStandbyLight()
  }

  getIntentMap () {
    return {
      lightswitch: this.applyStandbyLightSwitch.bind(this)
    }
  }

  getUrlMap () {
    return {
      standbyLight: this.onStandbyLightSwitchStatusChanged.bind(this)
    }
  }

  initStandbyLight () {
    var switchValue = property.get('persist.sys.standbylightswitch')
    if (switchValue === SWITCH_OPEN) {
      this.activity.light.play(STANDBY_LIGHT_JS, {}, {shouldResume: true})
    } else {
      this.activity.light.stop(STANDBY_LIGHT_JS)
    }
  }

  onStandbyLightSwitchStatusChanged (queryObj) {
    if (queryObj) {
      this.applyStandbyLightSwitch(queryObj.action, queryObj.isFirstLoad)
    }
  }

  applyStandbyLightSwitch (action, isFirstLoad) {
    if (action) {
      property.set('sys.standbylightswitch', action, 'persist')
      if (action === SWITCH_OPEN) {
        this.activity.light.play(STANDBY_LIGHT_JS, {}, {shouldResume: true})
      } else if (action === SWITCH_CLOSE) {
        this.activity.light.stop(STANDBY_LIGHT_JS)
      }
      if (!isFirstLoad) {
        if (action === SWITCH_OPEN) {
          this.activity.tts.speak(LIGHT_SWITCH_OPEN).then(() => this.activity.exit())
        } else if (action === SWITCH_CLOSE) {
          this.activity.tts.speak(LIGHT_SWITCH_CLOSE).then(() => this.activity.exit())
        } else {
          this.activity.tts.speak(CONFIG_FAILED).then(() => this.activity.exit())
        }
      }
    }
  }
}

module.exports = StandbyLight
