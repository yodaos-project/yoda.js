var _ = require('@yoda/util')._
var safeParse = require('@yoda/util').json.safeParse
var logger = require('logger')('custom-config')
var Url = require('url')
var CloudGW = require('@yoda/cloudgw')
var flora = require('@yoda/flora')
var WakeupEffect = require('wakeupEffect')
var StandbyLight = require('standbyLight')
var ContinuousDialog = require('continuousDialog')
var VtWord = require('vtWord')

var activity
var intentMap = {}
var urlMap = {}
var processorList = []
var cloudgw = null
var floraAgent = new flora.Agent(`unix:/var/run/flora.sock#custom_config`)
floraAgent.start()

module.exports = function CustomConfig (activityIn) {
  activity = activityIn
  activity.on('ready', onReady)
  activity.on('request', onRequest)
  activity.on('url', onUrl)
}

/**
 * skill url was requested
 * @param url - skill url
 */
function onUrl (url) {
  var urlObj = Url.parse(url)
  var queryObj = urlObj.query
  var path = urlObj.pathname.substr(1)
  logger.info(`on Url---->is called ${path}  ${JSON.stringify(urlObj.query)}`)
  if (path === 'firstLoad') {
    var customConfig = safeParse(queryObj.config)
    if (customConfig && typeof customConfig === 'object') {
      for (var field in customConfig) {
        if (customConfig.hasOwnProperty(field) && urlMap.hasOwnProperty(field)) {
          urlMap[field](safeParse(customConfig[field]))
        }
      }
    }
  } else {
    var func = urlMap[path]
    if (func) {
      func(queryObj)
    } else {
      logger.warn(`skill path [${path}] is not hit`)
    }
  }
}

/**
 * activity is ready
 */
function onReady () {
  activity.get().then(config => {
    cloudgw = new CloudGW(config)
    processorList.push(new StandbyLight(activity, floraAgent, cloudgw))
    processorList.push(new WakeupEffect(activity, floraAgent, cloudgw))
    processorList.push(new ContinuousDialog(activity, floraAgent, cloudgw))
    processorList.push(new VtWord(activity, floraAgent, cloudgw))
    for (var i = 0; i < processorList.length; ++i) {
      intentMap = Object.assign(intentMap, processorList[i].getIntentMap())
      urlMap = Object.assign(urlMap, processorList[i].getUrlMap())
    }
  })
}

/**
 * intent request
 * @param nlp
 * @param action
 */
function onRequest (nlp, action) {
  var intent = nlp.intent
  var actionValue = _.get(nlp, 'slots.open.type') || _.get(nlp, 'slots.close.type')
  logger.info('request---->intent:' + intent + ';   action: ' + actionValue)
  var func = intentMap[intent]
  if (func) {
    func(actionValue)
  } else {
    logger.warn(`intent [${intent}] is not hit`)
  }
}