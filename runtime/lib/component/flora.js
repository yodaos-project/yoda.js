
var logger = require('logger')('flora')
var inherits = require('util').inherits

var FloraComp = require('@yoda/flora/comp')
var safeParse = require('@yoda/util').json.safeParse

var floraConfig = require('../helper/config').getConfig('flora-config.json')

module.exports = Flora
/**
 *
 * @param {AppRuntime} runtime
 */
function Flora (runtime) {
  FloraComp.call(this, 'vui', floraConfig)
  this.runtime = runtime
  this.component = runtime.component
  this.descriptor = runtime.descriptor
}
inherits(Flora, FloraComp)

Flora.prototype.handlers = {
  'yodart.ttsd.event': function onTtsEvent (msg) {
    /** msg: [ event, ttsId, appId, Optional(errno) ] */
    var event = msg[0]
    var ttsId = msg[1]
    var appId = msg[2]
    logger.info(`VuiDaemon received ttsd event(${event}) for app(${appId}), tts(${ttsId})`)
    this.descriptor.tts.handleEvent.apply(this.descriptor.tts, msg)
  }
}

Flora.prototype.remoteMethods = {
  'yodart.vui.open-url': function OpenUrl (reqMsg, res) {
    var url = reqMsg[0]
    var options = safeParse(reqMsg[1])
    this.runtime.openUrl(url, options)
      .then(result => {
        res.end(0, [ JSON.stringify({ ok: true, result: result }) ])
      })
      .catch(err => {
        logger.info('unexpected error on opening url', url, options, err.stack)
        res.end(0, [ JSON.stringify({ ok: false, message: err.message, stack: err.stack }) ])
      })
  }
}
