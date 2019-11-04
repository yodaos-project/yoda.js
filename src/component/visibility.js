var _ = require('@yoda/util')._
var manifest = require('@yoda/manifest')
var logger = require('logger')('visibility')

var VisibilityHandler = {
  voice: function () {
    Object.defineProperty(this, 'keyAndVisibleAppId', {
      enumerable: true,
      get: () => {
        return _.get(this.component.audioFocus.getCurrentFocus(), 'appId')
      }
    })
    Object.defineProperty(this, 'visibleAppIds', {
      enumerable: true,
      get: () => {
        return [ this.component.audioFocus.transientRequest, this.component.audioFocus.lastingRequest ]
          .filter(it => it != null)
          .map(it => it.appId)
      }
    })

    this.abandonKeyVisibility = () => {
      return this.component.audioFocus.abandonCurrentFocus()
    }
    this.abandonAllVisibilities = () => {
      return this.component.audioFocus.abandonAllFocuses()
    }
  }
}

class Visibility {
  constructor (runtime) {
    this.runtime = runtime
    this.component = runtime.component
    this.keyAndVisibleAppId = undefined
    this.visibleAppIds = []

    var availableVisibilities = Object.keys(VisibilityHandler)
    var mainVisibility = manifest.get('capabilities.main-visibility', 'voice')
    if (availableVisibilities.indexOf(mainVisibility) < 0) {
      logger.error(`Unknown main-visibility manifest '${mainVisibility}'`)
      return
    }
    var handler = VisibilityHandler[mainVisibility]
    handler.apply(this)
  }

  /**
   * `keyAndVisibleApp` stands for the first responder and visible app.
   * While on some cases there might be multiple apps visible to users, yet only one key app was expected to respond to UI events.
   *
   * @returns {string|undefined} the app id
   */
  getKeyAndVisibleAppId () {
    return this.keyAndVisibleAppId
  }

  getVisibleAppIds () {
    return this.visibleAppIds
  }

  abandonKeyVisibility () {
    throw new Error('Not implemented')
  }

  abandonAllVisibilities () {
    throw new Error('Not implemented')
  }
}

module.exports = Visibility
