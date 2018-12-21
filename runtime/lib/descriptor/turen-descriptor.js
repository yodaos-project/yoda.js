'use strict'
/**
 * @namespace yodaRT.activity
 */

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter

module.exports = TurenDescriptor

/**
 * @memberof yodaRT.activity.Activity
 * @class TurenClient
 * @hideconstructor
 * @extends EventEmitter
 */
function TurenDescriptor (activityDescriptor, appId, appHome, runtime) {
  EventEmitter.call(this)
  this._activityDescriptor = activityDescriptor
  this._appId = appId
  this._appHome = appHome
  this._runtime = runtime
}
inherits(TurenDescriptor, EventEmitter)
TurenDescriptor.prototype.toJSON = function toJSON () {
  return TurenDescriptor.prototype
}

Object.assign(TurenDescriptor.prototype,
  {
    type: 'namespace'
  },
  {
    /**
     * add an activation word.
     * @memberof yodaRT.activity.Activity.TurenClient
     * @instance
     * @function addVtWord
     * @param {string} activationTxt -
     * @param {string} activationPy -
     * @returns {Promise<void>}
     */
    addVtWord: {
      type: 'method',
      returns: 'promise',
      fn: function addVtWord (activationTxt, activationPy) {
        return this._runtime.turen.addVtWord(activationTxt, activationPy)
      }
    },

    /**
     * delete an activation word.
     * @memberof yodaRT.activity.Activity.TurenClient
     * @instance
     * @function deleteVtWord
     * @param {string} activationTxt -
     * @returns {Promise<void>}
     */
    deleteVtWord: {
      type: 'method',
      returns: 'promise',
      fn: function deleteVtWord (activationTxt) {
        return this._runtime.turen.deleteVtWord(activationTxt)
      }
    }
  }
)
