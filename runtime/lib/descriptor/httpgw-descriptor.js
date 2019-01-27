
/**
 * @namespace yodaRT.activity.httpgw
 */

var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var cloudgw = require('@yoda/cloudgw')

module.exports = HttpgwDescriptor

/**
 * @memberof yodaRT.activity.Activity
 * @class HttpgwClient
 * @hideconstructor
 * @extends EventEmitter
 */
function HttpgwDescriptor (activityDescriptor, appId, appHome, runtime) {
  EventEmitter.call(this)
  this._activityDescriptor = activityDescriptor
  this._appId = appId
  this._appHome = appHome
  this._runtime = runtime
}
inherits(HttpgwDescriptor, EventEmitter)
HttpgwDescriptor.prototype.toJSON = function toJSON () {
  return HttpgwDescriptor.prototype
}
Object.assign(HttpgwDescriptor.prototype,
  {
    type: 'namespace'
  },
  {
    /**
     * Request with HTTPGW API.
     *
     * @memberof yodaRT.activity.Activity.HttpgwClient
     * @instance
     * @function request
     * @param {string} path - request path for httpgw.
     * @param {object} data - request data for httpgw.
     * @param {object} options - options of the httpgw
     * @param {string} options.service - httpgw service
     * @param {number} options.timeout - a number specifying the request timeout in milliseconds
     * @returns {Promise<object>}
     */
    request: {
      type: 'method',
      returns: 'promise',
      fn: function request (path, data, options) {
        return new Promise((resolve, reject) => {
          this._runtime.cloudApi.cloudgw.request(path, data, options, (err, data) => {
            if (err) {
              return reject(err)
            }
            resolve(data)
          })
        })
      }
    },
    /**
     * Get the httpgw signature.
     *
     * @memberof yodaRT.activity.Activity.HttpgwClient
     * @instance
     * @function getSignature
     * @param {object} options -
     * @param {string} options.service - httpgw service
     * @returns {Promise<string>}
     */
    getSignature: {
      type: 'method',
      returns: 'promise',
      fn: function getSignature (options) {
        var credential = this._runtime.getCopyOfCredential()
        return cloudgw.getAuth(Object.assign({}, options, credential))
      }
    }
  }
)
