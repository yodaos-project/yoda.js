var _ = require('@yoda/util')._
var safeParse = require('@yoda/util').json.safeParse
var logger = require('logger')('custom-config')
var WakeupEffect = require('./wakeup-effect')
var StandbyLight = require('./standby-light')
var ContinuousDialog = require('./continuous-dialog')
var VtWord = require('./vt-word')
var GSensor = require('./g-sensor')
var ContextManager = require('@yodaos/application/context-manager')

module.exports = function CustomConfig (activity) {
  var ctxMgr = new ContextManager(activity)
  var intentMap = {}
  var urlMap = {}
  var processorList = []
  processorList.push(new StandbyLight(activity))
  processorList.push(new WakeupEffect(activity))
  processorList.push(new ContinuousDialog(activity))
  processorList.push(new VtWord(activity))
  processorList.push(new GSensor(activity))
  for (var i = 0; i < processorList.length; ++i) {
    var tmpIntentMap = processorList[i].getIntentMap()
    for (var intentKey in tmpIntentMap) {
      if (!tmpIntentMap.hasOwnProperty(intentKey) || typeof tmpIntentMap[intentKey] !== 'function') {
        throw new Error(`value of intent map [${intentKey}] should be function`)
      }
    }
    Object.assign(intentMap, tmpIntentMap)
    var tmpUrlMap = processorList[i].getUrlMap()
    for (var urlKey in tmpUrlMap) {
      if (!tmpUrlMap.hasOwnProperty(urlKey) || typeof tmpUrlMap[urlKey] !== 'function') {
        throw new Error(`value of url map [${urlKey}] should be function`)
      }
    }
    Object.assign(urlMap, tmpUrlMap)
  }
  activity.on('ready', onReady)
  ctxMgr.on('request', onRequest)
  ctxMgr.on('url', onUrl)

  /**
   * skill url was requested
   * @param {object} ctx - context
   */
  function onUrl (ctx) {
    var urlObj = ctx.urlObj
    var queryObj = urlObj.query
    var path = ''
    if (urlObj.pathname && urlObj.pathname.length > 0) {
      path = urlObj.pathname.substr(1)
    }
    logger.info(`on Url---->is called [${path}]`)
    if (path === 'firstLoad') {
      var customConfig = safeParse(queryObj.config)
      if (customConfig && typeof customConfig === 'object') {
        for (var field in customConfig) {
          if (customConfig.hasOwnProperty(field) && urlMap.hasOwnProperty(field)) {
            var configObj = safeParse(customConfig[field])
            if (configObj && typeof configObj === 'object') {
              configObj.isFirstLoad = true
            }
            urlMap[field](configObj)
          }
        }
      }
    } else if (path === 'reload') {
      processorList.forEach((processor) => {
        processor.reload()
      })
    } else {
      var func = urlMap[path]
      if (func) {
        func(queryObj).then(() => {
          ctx.exit()
        }).cancel(()=>{
          logger.error('cancel')
          ctx.exit()
        }).catch((err) => {
          logger.warn(err)
          ctx.exit()
        })
      } else {
        logger.warn(`skill url [${path}] is not hit`)
        ctx.exit()
      }
    }
  }

  /**
   * activity is ready
   */
  function onReady () {
    activity.get().then(config => {
      for (var i = 0; i < processorList.length; ++i) {
        processorList[i].ready(config)
      }
    })
  }

  /**
   * intent request
   * @param {object} ctx - context
   */
  function onRequest (ctx) {
    var nlp = ctx.nlp
    var intent = nlp.intent
    var actionValue = _.get(nlp, 'slots.open.type') || _.get(nlp, 'slots.close.type')
    logger.info(`request---->intent: ${intent};   action:  + ${actionValue}`)
    var func = intentMap[intent]
    if (func) {
      func(actionValue).then(() => {
        ctx.exit()
      }).catch((err) => {
        logger.warn(err)
        ctx.exit()
      })
    } else {
      logger.warn(`intent [${intent}] is not hit`)
      ctx.exit()
    }
  }
}
