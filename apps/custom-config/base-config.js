'use strict'

class BaseConfig {
  constructor (activity, floraAgent, cloudgw) {
    this.activity = activity
    this.floraAgent = floraAgent
    this.cloudgw = cloudgw
  }

  getUrlMap () {
    return null
  }

  getIntentMap () {
    return null
  }
}

module.exports = BaseConfig
