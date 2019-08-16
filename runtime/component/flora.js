
var logger = require('logger')('flora')
var inherits = require('util').inherits

var FloraComp = require('@yoda/flora/comp')
var safeParse = require('@yoda/util').json.safeParse
var _ = require('@yoda/util')._
var url = require('url')

var floraConfig = require('../lib/config').getConfig('flora-config.json')

var endoscope = require('@yoda/endoscope')
var FloraExporter = require('@yoda/endoscope/exporter/flora')
endoscope.addExporter(new FloraExporter('yodaos.endoscope.export'))

var faunaInvocationDuration = new endoscope.Histogram('yodaos:runtime:fauna_invocation_duration', [ 'namespace', 'method', 'appId' ])

module.exports = Flora
/**
 *
 * @param {AppRuntime} runtime
 */
function Flora (runtime) {
  FloraComp.call(this, 'runtime', floraConfig)
  this.runtime = runtime
  this.component = runtime.component
  this.descriptor = runtime.descriptor

  this.networkMemo = null
}
inherits(Flora, FloraComp)

Flora.prototype.handlers = {
  'network.status': function NetworkStatus (msg) {
    var data = safeParse(msg[0])
    var state = _.get(data, 'network.state')
    if (state == null) {
      return
    }
    var memoState = _.get(this.networkMemo, 'network.state')
    if (state === 'CONNECTED' && state !== memoState) {
      /** force a routing table reset */
      Object.keys(this.component.appScheduler.pidAppIdMap)
        .forEach(pid => {
          var appId = this.component.appScheduler.pidAppIdMap[pid]
          this.call('yodaos.fauna.harbor', [ 'internal', JSON.stringify({
            topic: 'network-connected'
          })], `${appId}:${pid}`, 5000)
            .catch(err => {
              logger.error(`unexpected error on dispatching internal event(${'network-connected'}) to app(${appId}, ${pid})`, err.stack)
            })
        })
    }
    this.networkMemo = data
  },
  'yodaos.ntpd.event': function onTimeChanged (msg) {
    if (msg[0] === 'step') {
      this.runtime.componentsInvoke('timeDidChanged')
      this.component.broadcast.dispatch('yodaos.on-time-changed')
    }
  },
  'yodaos.otad.event': function onOtadEvent (msg) {
    if (msg[0] === 'prepared') {
      this.component.broadcast.dispatch('yodaos.on-ota-prepared')
    }
  }
}

Flora.prototype.remoteMethods = {
  'yodaos.runtime.open-url': function OpenUrl (reqMsg, res) {
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
  },
  'yodaos.runtime.open-url-format': function OpenUrlFormat (reqMsg, res) {
    logger.info('open-url with format', reqMsg)
    var urlObj = url.parse(reqMsg[0], true)
    reqMsg.slice(1).forEach(it => {
      if (!Array.isArray(it)) {
        return
      }
      urlObj.query[it[0]] = String(it[1])
    })
    /** Force url format to use un-stringified query object */
    delete urlObj.search
    delete urlObj.path
    delete urlObj.href
    this.runtime.openUrl(urlObj)
      .then(result => {
        res.end(0, [ JSON.stringify({ ok: true, result: result }) ])
      })
      .catch(err => {
        logger.info('unexpected error on opening url format', reqMsg, err.stack)
        res.end(0, [ JSON.stringify({ ok: false, message: err.message, stack: err.stack }) ])
      })
  },
  'yodaos.fauna.status-report': function StatusReport (reqMsg, res, sender) {
    var pid = sender.pid
    if (pid == null) {
      return res.end(403, [ `yodaos.fauna.status-report doesn't support been called over network.` ])
    }
    var appId = this.component.appScheduler.pidAppIdMap[sender.pid]
    if (appId == null) {
      return res.end(403, [ 'yodaos.fauna.status-report should be called within app process.' ])
    }
    var bridge = this.component.appScheduler.appMap[appId]

    if (reqMsg[0] !== 'alive') {
      logger.debug(`Received child(${appId}:${pid}) status-report ${reqMsg[0]}`)
    }
    bridge.statusReport.apply(bridge, reqMsg)
    res.end(0, [])
  },
  'yodaos.fauna.invoke': function Invoke (reqMsg, res, sender) {
    // Get app bridge
    if (sender.pid == null) {
      return res.end(403, [ `yodaos.fauna.invoke doesn't support been called over network.` ])
    }
    var appId = this.component.appScheduler.pidAppIdMap[sender.pid]
    if (appId == null) {
      return res.end(403, [ 'yodaos.fauna.invoke should be called within app process.' ])
    }
    var message = JSON.parse(reqMsg[0])
    var bridge = this.component.appScheduler.appMap[appId]

    var namespace = message.namespace
    var method = message.method
    var params = message.params
    logger.debug(`Received child(${appId}:${sender.pid}) invocation ${namespace || 'activity'}.${method}`)
    var slice = faunaInvocationDuration.start({ namespace: namespace, method: method, appId: appId })
    return bridge.invoke(namespace, method, params)
      .then(
        ret => {
          faunaInvocationDuration.end(slice)
          return res.end(0, [ JSON.stringify({
            action: 'resolve',
            result: ret
          }) ])
        },
        err => {
          faunaInvocationDuration.end(slice)
          return res.end(0, [ JSON.stringify({
            action: 'reject',
            error: Object.assign({}, err, { name: err.name, message: err.message })
          }) ])
        }
      )
  },
  'yodaos.fauna.subscribe': function Subscribe (reqMsg, res, sender) {
    if (sender.pid == null) {
      return res.end(403, [ `yodaos.fauna.subscribe doesn't support been called over network.` ])
    }
    var appId = this.component.appScheduler.pidAppIdMap[sender.pid]
    if (appId == null) {
      return res.end(403, [ 'yodaos.fauna.subscribe should be called within app process.' ])
    }
    var message = JSON.parse(reqMsg[0])
    var bridge = this.component.appScheduler.appMap[appId]

    var namespace = message.namespace
    var event = message.event
    logger.debug(`Received child(${appId}:${sender.pid}) subscription ${namespace || 'activity'}.${event}`)
    var self = this
    bridge.subscribe(namespace, event, function OnEvent () {
      logger.debug(`Dispatching message(${namespace || 'activity'}.${event}) to child(${appId}:${sender.pid})`)
      self.call('yodaos.fauna.harbor', [ 'event', JSON.stringify({
        namespace: namespace,
        event: event,
        params: Array.prototype.slice.call(arguments, 0)
      })], `${appId}:${sender.pid}`, 5000)
        .catch(err => {
          logger.error(`unexpected error on dispatching event(${namespace}.${event}) to app(${appId}, ${sender.pid})`, err.stack)
        })
    })
    res.end(0, [])
  }
}
