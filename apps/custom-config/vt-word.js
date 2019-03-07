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
    if (!realQueryObj || !(realQueryObj instanceof Array)) {
      return
    }
    realQueryObj = realQueryObj[0]
    this.assertVtWordValueValid(realQueryObj) // set default value for undefine values
    if (!isFirstLoad && realQueryObj.action) {
      if (realQueryObj.action === SWITCH_VT_UPDATE) {
        logger.info(`turen update ${realQueryObj.txt}`)
        this.activity.turen.deleteVtWord(realQueryObj.oldTxt)
        this.activity.turen.addVtWord(realQueryObj.txt, realQueryObj.py, realQueryObj.margin_index, realQueryObj.cloud_confirm)
        this.sendAddUpdateStatusToServer(realQueryObj)
        this.sendSuccessStatusToApp(realQueryObj, true)
      } else if (realQueryObj.action === SWITCH_VT_ADD) {
        this.activity.turen.addVtWord(realQueryObj.txt, realQueryObj.py, realQueryObj.margin_index, realQueryObj.cloud_confirm)
        this.sendAddUpdateStatusToServer(realQueryObj)
        this.sendSuccessStatusToApp(realQueryObj, true)
      } else if (realQueryObj.action === SWITCH_VT_DELETE) {
        this.activity.turen.deleteVtWord(realQueryObj.txt)
        this.sendDeleteStatusToServer(realQueryObj)
        this.sendSuccessStatusToApp(realQueryObj, true)
      }
      this.activity.exit()
    } else if (isFirstLoad) {
      if (realQueryObj.action === SWITCH_VT_UPDATE) {
        logger.info(`turen update first load ${realQueryObj.txt}`)
        this.activity.turen.deleteVtWord(realQueryObj.oldTxt)
        this.activity.turen.addVtWord(realQueryObj.txt, realQueryObj.py, realQueryObj.margin_index, realQueryObj.cloud_confirm)
      } else if (realQueryObj.action === SWITCH_VT_ADD) {
        this.activity.turen.addVtWord(realQueryObj.txt, realQueryObj.py, realQueryObj.margin_index, realQueryObj.cloud_confirm)
      } else if (realQueryObj.action === SWITCH_VT_DELETE) {
        this.activity.turen.deleteVtWord(realQueryObj.txt)
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
    }
  }

  /**
   * call the cloud api: addOrUpdateDeviceInfo
   * @param {object} queryObj
   */
  sendAddUpdateStatusToServer (queryObj) {
    var sendVtObj = {
      vt_words: JSON.stringify([{
        py: queryObj.py,
        txt: queryObj.txt,
        oldTxt: queryObj.oldTxt,
        action: queryObj.action,
        phoneme: '',
        // add sensibility and cloud-confirm option of awake words
        margin_index: queryObj.margin_index,
        cloud_confirm: queryObj.cloud_confirm
      }])
    }
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
      vt_words: JSON.stringify([{
        py: queryObj.py,
        txt: '',
        oldTxt: queryObj.oldTxt,
        action: '',
        phoneme: ''
      }])
    }
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
    var sendObj = {
      vt_words: JSON.stringify([{
        py: queryObj.py,
        oldTxt: queryObj.oldTxt,
        txt: queryObj.txt,
        action: queryObj.action,
        success: setStatus
      }])
    }
    this.activity.wormhole.sendToApp(VT_WORDS_TOPIC, sendObj)
  }
}

module.exports = VtWord
