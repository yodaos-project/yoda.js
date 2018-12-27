'use strict'
var BaseConfig = require('./baseConfig')

var SWITCH_VT_UPDATE = 'update'
var SWITCH_VT_ADD = 'add'
var SWITCH_VT_DELETE = 'delete'
var VT_WORDS_TOPIC = 'custom_config'
var safeParse = require('@yoda/util').json.safeParse
var logger = require('logger')('custom-config-vtwords')

class VtWord extends BaseConfig {
  /**
   * get the url handler object
   * @returns {{vt_words: any}}
   */
  getUrlMap () {
    return {
      'vt_words': this.onVtWordSwitchStatusChanged.bind(this)
    }
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
    if (!realQueryObj || !(realQueryObj instanceof Array)) {
      return
    }
    realQueryObj = realQueryObj[0]
    if (!isFirstLoad && realQueryObj.action) {
      if (realQueryObj.action === SWITCH_VT_UPDATE) {
        logger.info(`turen update ${realQueryObj.txt}`)
        this.activity.turen.deleteVtWord(realQueryObj.oldTxt)
        this.activity.turen.addVtWord(realQueryObj.txt, realQueryObj.py)
        this.sendAddUpdateStatusToServer(realQueryObj)
        this.sendSuccessStatusToApp(realQueryObj, true)
      } else if (realQueryObj.action === SWITCH_VT_ADD) {
        this.activity.turen.addVtWord(realQueryObj.txt, realQueryObj.py)
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
        this.activity.turen.addVtWord(realQueryObj.txt, realQueryObj.py)
      } else if (realQueryObj.action === SWITCH_VT_ADD) {
        this.activity.turen.addVtWord(realQueryObj.txt, realQueryObj.py)
      } else if (realQueryObj.action === SWITCH_VT_DELETE) {
        this.activity.turen.deleteVtWord(realQueryObj.txt)
      }
      this.activity.exit()
    }
  }

  /**
   * call the cloud api: addOrUpdateDeviceInfo
   * @param queryObj
   */
  sendAddUpdateStatusToServer (queryObj) {
    var sendVtObj = {
      vt_words: JSON.stringify([{
        py: queryObj.py,
        txt: queryObj.txt,
        oldTxt: queryObj.oldTxt,
        action: queryObj.action,
        phoneme: ''
      }])
    }
    this.cloudgw.request('/v1/device/deviceManager/addOrUpdateDeviceInfo',
      { namespace: 'custom_config', values: sendVtObj })
  }

  /**
   * call the cloud api: sendDeleteStatusToServer
   * @param queryObj
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
    this.cloudgw.request('/v1/device/deviceManager/addOrUpdateDeviceInfo',
      { namespace: 'custom_config', values: sendVtObj })
  }

  /**
   * call the wormhole to send success message to app
   * @param queryObj
   * @param setStatus - result for operating
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
