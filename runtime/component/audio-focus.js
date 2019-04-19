var _ = require('@yoda/util')._

var RequestType = {
  DEFAULT: 0b000,
  TRANSIENT: 0b001,
  EXCLUSIVE: 0b010,
  MAY_DUCK: 0b100
}

var RequestStatus = {
  DELAYED: -2,
  FAILED: -1,
  GRANTED: 0
}

/**
 * @typedef Request
 * @property {string} reqId
 * @property {string} appId
 * @property {string} gain
 */

/**
 * @typedef FocusRequest
 * @property {string} reqId
 * @property {string} appId
 * @property {number} exclusive
 * @property {number} mayDuck
 * @property {number} transient
 * @property {boolean} acceptsDelay
 */

class AudioFocus {
  constructor (runtime) {
    this.runtime = runtime
    this.descriptor = runtime.descriptor

    this.transientRequest = null
    this.lastingRequest = null
  }

  getCurrentFocus () {
    if (this.transientRequest != null) {
      return this.transientRequest
    }
    return this.lastingRequest
  }

  /**
   *
   * @param {FocusRequest} req
   */
  request (req) {
    var gain = req.gain || 0
    req = Object.assign(_.pick(req, 'id', 'appId'), {
      transient: gain & RequestType.TRANSIENT,
      exclusive: gain & RequestType.EXCLUSIVE,
      mayDuck: gain & RequestType.MAY_DUCK
    })
    var currentFocus = this.getCurrentFocus()
    if (_.get(currentFocus, 'exclusive')) {
      return RequestStatus.FAILED
    }

    if (req.transient) {
      this.shiftTransientFocus(req)
      return RequestStatus.GRANTED
    }

    this.shiftLastingFocus(req)
    return RequestStatus.GRANTED
  }

  /**
   *
   * @param {number} id
   */
  abandon (appId, id) {
    var req
    if (this.transientRequest && this.transientRequest.appId === appId && this.transientRequest.id === id) {
      req = this.transientRequest
      this.transientRequest = null
      this.castRequest(req)
      this.recoverLastingRequest()
      return
    }
    if (this.lastingRequest && this.lastingRequest.appId === appId && this.lastingRequest.id === id) {
      req = this.lastingRequest
      this.lastingRequest = null
      this.castRequest(req)
    }
  }

  recoverLastingRequest () {
    var req = this.lastingRequest
    if (req == null) {
      return
    }
    this.descriptor.audioFocus.emitToApp(req.appId, 'gain', [ req.id ])
  }

  shiftTransientFocus (req) {
    var tmp = this.transientRequest
    if (tmp) {
      this.transientRequest = null
      this.castRequest(tmp, req.transient, req.mayDuck)
    } else {
      tmp = this.lastingRequest
      if (tmp) {
        this.castRequest(tmp, req.transient, req.mayDuck)
      }
    }
    this.transientRequest = req
    this.descriptor.audioFocus.emitToApp(req.appId, 'gain', [ req.id ])
  }

  shiftLastingFocus (req) {
    var tmp = this.transientRequest
    if (tmp) {
      this.transientRequest = null
      this.castRequest(tmp, req.transient, req.mayDuck)
    }
    tmp = this.lastingRequest
    if (tmp) {
      this.lastingRequest = null
      this.castRequest(tmp, req.transient, req.mayDuck)
    }
    this.lastingRequest = req
    this.descriptor.audioFocus.emitToApp(req.appId, 'gain', [ req.id ])
  }

  castRequest (req, transient, mayDuck) {
    transient = transient == null ? false : transient
    mayDuck = mayDuck == null ? false : mayDuck
    this.descriptor.audioFocus.emitToApp(req.appId, 'loss', [ req.id, transient === 1, mayDuck === 1 ])
  }

  appDidExit (appId) {
    var req
    if (this.transientRequest && this.transientRequest.appId === appId) {
      req = this.transientRequest
      this.transientRequest = null
      this.castRequest(req)
      this.recoverLastingRequest()
      return
    }
    if (this.lastingRequest && this.lastingRequest.appId === appId) {
      req = this.lastingRequest
      this.lastingRequest = null
      this.castRequest(req)
    }
  }
}

AudioFocus.RequestType = RequestType
module.exports = AudioFocus
