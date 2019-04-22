'use strict'
var property = require('@yoda/property')
var BaseConfig = require('./base-config')
var logger = require('logger')('custom-config-g-sensor')

/**
 * g-sensor handler
 * @extends BaseConfig
 */
class GSensor extends BaseConfig {
  /**
   * get url map
   * @returns {object} - url map
   */
  getUrlMap () {
    return {
      gsensor: this.onGSensorSwitchChanged.bind(this)
    }
  }

  /**
   * handler of skill url
   * @param {object} queryObj
   */
  onGSensorSwitchChanged (queryObj) {
    if (queryObj) {
      if (queryObj.action) {
        logger.info(`GSensor is turned ${(queryObj.action === 'open' ? 'on' : 'off')}`)
        property.set('sys.gsensor', queryObj.action, 'persist')
      }
    }
    if (!queryObj.isFirstLoad) {
      this.activity.exit()
    }
  }
}

module.exports = GSensor
