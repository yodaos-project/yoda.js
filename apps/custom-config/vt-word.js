'use strict'
var BaseConfig = require('./base-config')

var SWITCH_VT_UPDATE = 'update'
var SWITCH_VT_ADD = 'add'
var SWITCH_VT_DELETE = 'delete'
var VT_WORDS_TOPIC = 'custom_config'
var safeParse = require('@yoda/util').json.safeParse
var logger = require('logger')('custom-config-vtwords')
var CloudGW = require('@yoda/cloudgw')

/**
 * vt words handler
 * @extends BaseConfig
 */
class VtWord extends BaseConfig {
  /**
   * get the url handler object
   * @returns {object} url map
   */
  getUrlMap () {
    return {
      'vt_words': this.onVtWordSwitchStatusChanged.bind(this)
    }
  }
  /**
   * ready for cloudgw
   * @param {object} cloudgwConfig
   */
  ready (cloudgwConfig) {
    this.cloudgw = new CloudGW(cloudgwConfig)
  }
  /**
   * handle the url of 'vt_words'
   * @param {object} queryObj
   */
  onVtWordSwitchStatusChanged (queryObj) {
    var realQueryObj
    var isFirstLoad = false
    if (queryObj.param) {
      realQueryObj = safeParse(queryObj.param)
      logger.info(`vt words in ${queryObj.param}`)
    } else {
      realQueryObj = queryObj
      isFirstLoad = true
      logger.info(`vt words in ${queryObj}`)
    }
    logger.info('vt-word values= ', realQueryObj)
    if (!realQueryObj || !(realQueryObj instanceof Array) || realQueryObj.length === 0) {
      return
    }
    for (var i = 0; i < realQueryObj.length; ++i) {
      if (!this.assertVtWordValueValid(realQueryObj[i])) { // set default value for undefine values
        logger.warn('invalid vt-words config: ', realQueryObj[i])
        return
      }
    }
    if (!isFirstLoad && realQueryObj[0].action) {
      if (realQueryObj[0].action === SWITCH_VT_UPDATE) {
        logger.info('turen update load:', realQueryObj)
        this.activity.turen.setVtWords(realQueryObj)
        this.sendAddUpdateStatusToServer(realQueryObj)
        this.sendSuccessStatusToApp(realQueryObj, true)
      } else if (realQueryObj[0].action === SWITCH_VT_ADD) {
        this.activity.turen.setVtWords(realQueryObj)
        this.sendAddUpdateStatusToServer(realQueryObj)
        this.sendSuccessStatusToApp(realQueryObj, true)
      } else if (realQueryObj[0].action === SWITCH_VT_DELETE) {
        this.activity.turen.setVtWords([{
          txt: '',
          py: '',
          margin_index: 50,
          cloud_confirm: 0
        }])
        this.sendDeleteStatusToServer(realQueryObj)
        this.sendSuccessStatusToApp(realQueryObj, true)
      }
      this.activity.exit()
    } else if (isFirstLoad) {
      if (realQueryObj[0].action === SWITCH_VT_UPDATE) {
        logger.info('turen update first load:', realQueryObj)
        this.activity.turen.setVtWords(realQueryObj)
      } else if (realQueryObj[0].action === SWITCH_VT_ADD) {
        this.activity.turen.setVtWords(realQueryObj)
      } else if (realQueryObj[0].action === SWITCH_VT_DELETE) {
        this.activity.turen.setVtWords([{
          txt: '',
          py: '',
          margin_index: 50,
          cloud_confirm: 0
        }])
      }
      this.activity.exit()
    }
  }

  assertVtWordValueValid (config) {
    if (config) {
      if (typeof config.margin_index !== 'number') {
        // set default margin-index to 50 as normal sensibility of awake
        config.margin_index = 50
      }
      if (typeof config.cloud_confirm !== 'number') {
        // set default value for cloud second confirm switcher to off
        config.cloud_confirm = 0
      }
      return typeof config.txt === 'string' && typeof config.py === 'string'
    } else {
      return false
    }
  }

  /**
   * call the cloud api: addOrUpdateDeviceInfo
   * @param {object} queryObj
   */
  sendAddUpdateStatusToServer (queryObj) {
    var sendVtObj = {
      vt_words: ''
    }
    var arrayOfVtWords = []
    queryObj.forEach((obj) => {
      arrayOfVtWords.push({
        py: obj.py,
        oldTxt: obj.oldTxt,
        txt: obj.txt,
        action: obj.action,
        phoneme: '',
        // add sensibility and cloud-confirm option of awake words
        margin_index: queryObj.margin_index,
        cloud_confirm: queryObj.cloud_confirm
      })
    })
    sendVtObj.vt_words = JSON.stringify(arrayOfVtWords)
    if (this.cloudgw) {
      this.cloudgw.request('/v1/device/deviceManager/addOrUpdateDeviceInfo',
        { namespace: 'custom_config', values: sendVtObj })
    } else {
      logger.warn(`cloudgw is not ready for sendAddUpdateStatusToServer`)
    }
  }

  /**
   * call the cloud api: sendDeleteStatusToServer
   * @param {object} queryObj
   */
  sendDeleteStatusToServer (queryObj) {
    var sendVtObj = {
      vt_words: ''
    }
    var arrayOfVtWords = []
    queryObj.forEach((obj) => {
      arrayOfVtWords.push({
        py: obj.py,
        txt: '',
        oldTxt: obj.oldTxt,
        action: '',
        phoneme: ''
      })
    })
    sendVtObj.vt_words = JSON.stringify(arrayOfVtWords)
    if (this.cloudgw) {
      this.cloudgw.request('/v1/device/deviceManager/addOrUpdateDeviceInfo',
        { namespace: 'custom_config', values: sendVtObj })
    } else {
      logger.warn(`cloudgw is not ready for sendDeleteStatusToServer`)
    }
  }

  /**
   * call the wormhole to send success message to app
   * @param {object} queryObj
   * @param {boolean} setStatus - result for operating
   */
  sendSuccessStatusToApp (queryObj, setStatus) {
    var sendVtObj = {
      vt_words: ''
    }
    var arrayOfVtWords = []
    queryObj.forEach((obj) => {
      arrayOfVtWords.push({
        py: obj.py,
        oldTxt: obj.oldTxt,
        txt: obj.txt,
        action: obj.action,
        success: setStatus
      })
    })
    sendVtObj.vt_words = JSON.stringify(arrayOfVtWords)
    this.activity.wormhole.sendToApp(VT_WORDS_TOPIC, sendVtObj)
  }
}

module.exports = VtWord
