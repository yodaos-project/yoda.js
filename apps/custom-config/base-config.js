'use strict'
var CloudGW = require('@yoda/cloudgw')
/**
 * base config class
 */
class BaseConfig {
  constructor (activity, floraAgent, cloudgwConfig) {
    this.activity = activity
    this.floraAgent = floraAgent
    this.cloudgw = new CloudGW(cloudgwConfig)
  }

  /**
   * url map getter
   * @returns {null}
   */
  getUrlMap () {
    return null
  }

  /**
   * intent map getter
   * @returns {null}
   */
  getIntentMap () {
    return null
  }
}

module.exports = BaseConfig
