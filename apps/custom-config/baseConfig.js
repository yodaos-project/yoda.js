'use strict'

class BaseConfig {
  constructor (activity, floraAgent, cloudgw) {
    this.activity = activity
    this.floraAgent = floraAgent
    this.cloudgw = cloudgw
  }

  getUrlMap () {
    throw Error('getUrlMap is not implemented')
  }

  getIntentMap () {
    throw Error('getIntentMap is not implemented')
  }
}

module.exports = BaseConfig
