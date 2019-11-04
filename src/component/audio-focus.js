var _ = require('@yoda/util')._
var assert = require('assert')

var endoscope = require('@yoda/endoscope')
var focusShiftMetric = new endoscope.Counter(
  'yodaos:runtime:audio_focus_shift',
  [ 'id', 'appId', 'transient', 'mayDuck', 'exclusive' ]
)

var FocusShiftChannel = 'yodaos.audio-focus.on-focus-shift'

var RequestType = {
  DEFAULT: 0b000,
  TRANSIENT: 0b001,
  EXCLUSIVE: 0b010,
  MAY_DUCK: 0b100
}

var RequestStatus = {
  REQUEST_NOT_MATCH: -3,
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
    this.component = runtime.component
    this.descriptor = runtime.descriptor

    this.transientRequest = null
    this.lastingRequest = null
  }

  init () {
    this.component.broadcast.registerBroadcastChannel(FocusShiftChannel)
  }

  getCurrentFocus () {
    if (this.transientRequest != null) {
      return this.transientRequest
    }
    return this.lastingRequest
  }
  getCurrentFocuses () {
    return [this.transientRequest, this.lastingRequest].filter(it => it != null)
  }

  /**
   *
   * @param {FocusRequest} req
   */
  request (req) {
    var gain = req.gain || 0
    req = Object.assign(_.pick(req, 'id', 'appId'), {
      transient: (gain & RequestType.TRANSIENT) > 0,
      exclusive: (gain & RequestType.EXCLUSIVE) > 0,
      mayDuck: (gain & RequestType.MAY_DUCK) > 0
    })
    if (this.guardRequest(req)) {
      return RequestStatus.REQUEST_NOT_MATCH
    }

    var currentFocus = this.getCurrentFocus()
    if (_.get(currentFocus, 'appId') === req.appId && _.get(currentFocus, 'id') === req.id) {
      return RequestStatus.GRANTED
    }
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
   * @param {string} appId
   * @param {number} id
   */
  abandon (appId, id) {
    var req
    if (this.transientRequest && this.transientRequest.appId === appId && this.transientRequest.id === id) {
      req = this.transientRequest
      this.transientRequest = null
      this.castRequest(req)
      this.recoverLastingRequest()
      this.component.broadcast.dispatch(FocusShiftChannel, [ this.lastingRequest, req ])
      focusShiftMetric.inc(this.lastingRequest)
      return
    }
    if (this.lastingRequest && this.lastingRequest.appId === appId && this.lastingRequest.id === id) {
      req = this.lastingRequest
      this.lastingRequest = null
      this.castRequest(req)
    }
  }

  abandonCurrentFocus () {
    var focus = this.getCurrentFocus()
    if (focus) {
      this.abandon(focus.appId, focus.id)
    }
  }

  abandonAllFocuses () {
    ;[this.transientRequest, this.lastingRequest].forEach(it => {
      if (it == null) {
        return
      }
      this.castRequest(it)
    })
    var transientRequest = this.transientRequest
    this.transientRequest = null
    var lastingRequest = this.lastingRequest
    this.lastingRequest = null

    if (transientRequest || lastingRequest) {
      this.component.broadcast.dispatch(FocusShiftChannel, [ null, transientRequest || lastingRequest ])
      focusShiftMetric.inc(null)
    }
  }

  // MARK: - Private methods

  /**
   * @private
   */
  recoverLastingRequest () {
    var req = this.lastingRequest
    if (req == null) {
      return
    }
    this.descriptor.audioFocus.emitToApp(req.appId, 'gain', [ req.id ])
  }

  /**
   * @private
   */
  guardRequest (req) {
    try {
      if (this.transientRequest && this.transientRequest.appId === req.appId && this.transientRequest.id === req.id) {
        assert.deepStrictEqual(this.transientRequest, req)
      }
      if (this.lastingRequest && this.lastingRequest.appId === req.appId && this.lastingRequest.id === req.id) {
        assert.deepStrictEqual(this.lastingRequest, req)
      }
    } catch (e) {
      return true
    }
    return false
  }

  /**
   * @private
   */
  shiftTransientFocus (req) {
    var prev = this.transientRequest
    if (prev) {
      this.transientRequest = null
      this.castRequest(prev/** transient focus could not be lost transiently */)
    } else {
      prev = this.lastingRequest
      if (prev) {
        this.castRequest(prev, req.transient, req.mayDuck)
      }
    }
    this.transientRequest = req
    this.descriptor.audioFocus.emitToApp(req.appId, 'gain', [ req.id ])
    this.component.broadcast.dispatch(FocusShiftChannel, [ req, prev ])
    focusShiftMetric.inc(req)
  }

  /**
   * @private
   */
  shiftLastingFocus (req) {
    var prev = this.transientRequest
    if (prev) {
      this.transientRequest = null
      this.castRequest(prev, req.transient, req.mayDuck)
    }
    prev = this.lastingRequest
    if (prev) {
      /** in case of identical focus re-request */
      if (prev.appId !== req.appId || prev.id !== req.id) {
        this.lastingRequest = null
        this.castRequest(prev, req.transient, req.mayDuck)
      }
    }
    this.lastingRequest = req
    this.descriptor.audioFocus.emitToApp(req.appId, 'gain', [ req.id ])
    this.component.broadcast.dispatch(FocusShiftChannel, [ req, prev ])
    focusShiftMetric.inc(req)
  }

  /**
   * @private
   */
  castRequest (req, transient, mayDuck) {
    transient = transient == null ? false : transient
    mayDuck = mayDuck == null ? false : mayDuck
    this.descriptor.audioFocus.emitToApp(req.appId, 'loss', [ req.id, transient, mayDuck ])
  }

  appDidExit (appId) {
    var req
    if (this.transientRequest && this.transientRequest.appId === appId) {
      req = this.transientRequest
      this.transientRequest = null
      this.castRequest(req)
      this.recoverLastingRequest()
      this.component.broadcast.dispatch(FocusShiftChannel, [ this.lastingRequest, req ])
      focusShiftMetric.inc(this.lastingRequest)
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
