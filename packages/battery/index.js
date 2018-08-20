'use strict'

/**
 * @namespace battery
 * @description provide the battery state management.
 */

var ffi = require('ffi')
var lib = ffi.Library('libpower_ctrl.so', {
  'power_get_property': [ 'int', [ 'pointer' ] ]
})

var fields = [
  [ 'status', 'int' ],
  [ 'online', 'int' ],
  [ 'vbus_type', 'int' ],
  [ 'charge_current', 'int' ],
  [ 'temp', 'int' ],
  [ 'capacity', 'int' ],
  [ 'health', 'int' ],
  [ 'battery_present', 'int' ],
  [ 'voltagenow', 'int' ],
  [ 'voltagemax', 'int' ],
  [ 'voltagemin', 'int' ],
  [ 'currentnow', 'int' ],
  [ 'time_to_empty_now', 'int' ],
  [ 'time_to_empty_avg', 'int' ],
  [ 'time_to_full', 'int' ],
  [ 'charge_full', 'int' ],
  [ 'energy_avg', 'int' ]
]
var BatteryState = ffi.Struct(fields)

module.exports = {
  /**
   * @memberof battery
   * @function get
   * @param {BatteryState} powerState a pre-allocated PowerState memory block
   * @returns {Number} status code, 0 if success, non-zero code otherwise
   */
  get: lib.power_get_property,
  /**
   * @memberof battery
   * @constructor
   * @param {Object} [fields] initialized with given fields, leaves unspecified fields uninitialized
   * @param {Number} [fields.status]
   * @param {Number} [fields.online]
   * @param {Number} [fields.vbus_type]
   * @param {Number} [fields.charge_current]
   * @param {Number} [fields.temp]
   * @param {Number} [fields.capacity]
   * @param {Number} [fields.health]
   * @param {Number} [fields.battery_present]
   * @param {Number} [fields.voltagenow]
   * @param {Number} [fields.voltagemax]
   * @param {Number} [fields.voltagemin]
   * @param {Number} [fields.currentnow]
   * @param {Number} [fields.time_to_empty_now]
   * @param {Number} [fields.time_to_empty_avg]
   * @param {Number} [fields.time_to_full]
   * @param {Number} [fields.charge_full]
   * @param {Number} [fields.energy_avg]
   */
  BatteryState: BatteryState
}
