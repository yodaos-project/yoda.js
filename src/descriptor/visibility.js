'use strict'
/**
 * @namespace yodaRT.activity
 */

var Descriptor = require('../lib/descriptor')
var logger = require('logger')('visibility-descriptor')

/**
 * @memberof yodaRT.activity.Activity
 * @class VisibilityClient
 * @hideconstructor
 * @extends EventEmitter
 */
class VisibilityDescriptor extends Descriptor {
  constructor (runtime) {
    super(runtime, 'visibility')
    this.vsbl = runtime.component.visibility
  }
  getKeyAndVisibleAppId () {
    return this.vsbl.getKeyAndVisibleAppId()
  }

  abandonKeyVisibility () {
    logger.info('abandoning key visibility')
    return this.vsbl.abandonKeyVisibility()
  }

  abandonAllVisibilities () {
    logger.info('abandoning all visibilities')
    return this.vsbl.abandonAllVisibilities()
  }
}

VisibilityDescriptor.methods = {
  /**
   * Get key and visible app id.
   *
   * @memberof yodaRT.activity.Activity.VisibilityClient
   * @instance
   * @function getKeyAndVisibleAppId
   * @returns {Promise<string|undefined>}
   */
  getKeyAndVisibleAppId: {
    returns: 'promise'
  },
  /**
   * Abandon key visibility if presents.
   *
   * @memberof yodaRT.activity.Activity.VisibilityClient
   * @instance
   * @function abandonKeyVisibility
   * @returns {Promise<void>}
   */
  abandonKeyVisibility: {
    returns: 'promise'
  },
  /**
   * Abandon all visibilities and recover to launcher if possible.
   *
   * @memberof yodaRT.activity.Activity.VisibilityClient
   * @instance
   * @function abandonAllVisibilities
   * @returns {Promise<void>}
   */
  abandonAllVisibilities: {
    returns: 'promise'
  }
}

module.exports = VisibilityDescriptor
