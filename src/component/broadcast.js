var logger = require('logger')('broadcast')

class Broadcast {
  constructor (runtime) {
    this.runtime = runtime
    this.component = runtime.component
    this.descriptor = runtime.descriptor

    this.broadcasts = [ 'yodaos.on-phase-reset', 'yodaos.on-phase-ready', 'yodaos.on-time-changed' ]
    this.interests = Object.create(null)
  }

  appDidExit (appId) {
    delete this.interests[appId]
  }

  /**
   * Register a broadcast channel so that apps could declare their interests on the broadcast.
   *
   * > NOTE: should be invoked on component's init or construction. Doesn't work on apps loaded before
   * the registration.
   *
   * @param {string} channel
   */
  registerBroadcastChannel (channel) {
    if (this.broadcasts.indexOf(channel) >= 0) {
      return
    }
    logger.info(`registering broadcast channel '${channel}'`)
    this.broadcasts.push(channel)

    /** support statically declared broadcasts */
    this.component.appLoader.registerBroadcastChannel(channel)
  }

  registerBroadcastReceiver (channel, appId) {
    var it = this.interests[appId]
    if (it == null) {
      it = this.interests[appId] = Object.create(null)
    }
    it[channel] = true
  }

  unregisterBroadcastReceiver (channel, appId) {
    var it = this.interests[appId]
    if (it == null) {
      return
    }
    delete it[channel]
  }

  /**
   * Dispatches a broadcast request to apps registered for the channel.
   *
   * @param {string} channel
   * @param {any[]} extra
   * @param {object} [options]
   */
  dispatch (channel, extra) {
    var appIds = Object.keys(this.interests).filter(it => {
      if (this.interests[it][channel]) {
        return true
      }
      return false
    })
    var staticInterests = this.component.appLoader.broadcasts[channel]
    if (staticInterests != null && staticInterests.length > 0) {
      appIds = appIds.concat(staticInterests)
    }

    logger.info(`dispatching broadcast(${channel}) to [ ${appIds} ]`)
    if (appIds.length === 0) {
      return Promise.resolve()
    }

    var broadcastArgs = extra === undefined ? [ channel ] : [ channel, extra ]
    var self = this
    return step(0)

    function step (idx) {
      if (idx >= appIds.length) {
        return Promise.resolve()
      }
      var appId = appIds[idx]
      var future = Promise.resolve()
      future = self.component.appScheduler.createApp(appId)
        .catch(err => {
          /** force quit app on create error */
          logger.error(`create app ${appId} failed`, err.stack)
          return self.component.appScheduler.suspendApp(appId, { force: true })
            .then(() => { /** rethrow error to break following procedures */throw err })
        })
      return future
        .then(() => self.descriptor.broadcast.emitToApp(appId, 'broadcast', broadcastArgs))
        .catch(err => {
          logger.error(`send broadcast(${channel}) failed with appId: ${appId}`, err.stack)
        })
        .then(() => step(idx + 1))
    }
  }
}

module.exports = Broadcast
