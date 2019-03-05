'use strict'
var flora = require('./singleton-flora')

/**
 * base config class
 */
class BaseConfig {
  constructor (activity) {
    this.activity = activity
    this.floraAgent = flora.getInstance()
    this.cloudgw = null
  }

  /**
   * url map getter
   * @returns {null} return null by default
   */
  getUrlMap () {
    return null
  }

  /**
   * intent map getter
   * @returns {null} return null by default
   */
  getIntentMap () {
    return null
  }

  /**
   * ready for cloudgw
   * @param {object} cloudgwConfig
   */
  ready (cloudgwConfig) {
  }

  /**
   * reload
   */
  reload () {
  }
}

/**
 * request checker
 */
class RequestChecker {
  constructor () {
    this.requestID = RequestChecker.reqID++
  }

  /**
   * do check
   * @param future {Promise<T>}
   * @return {Promise<T | never>}
   */
  do (future) {
    return future.then((res) => {
      if (this.requestID === RequestChecker.reqID - 1) {
        return Promise.resolve(res)
      } else {
        return Promise.reject(new Error(`request abort`))
      }
    })
  }
}
RequestChecker.reqID = 0

module.exports.BaseConfig = BaseConfig
module.exports.RequestChecker = RequestChecker
