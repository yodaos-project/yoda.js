'use strict';

/**
 * @namespace battery
 */

var ffi = require('ffi');
var battery = ffi.Library('libpower_ctrl.so', {
  /**
   * @memberof battery
   * @function get
   * @param {BatteryState} powerState a pre-allocated PowerState memory block
   * @returns {number} status code, 0 if success, non-zero code otherwise
   */
  'get': [ 'int', [ 'pointer' ] ]
});

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
];

/**
 * @memberof battery
 * @constructor
 * @param {Object} [fields] initialized with given fields, leaves unspecified fields uninitialized
 * @param {number} [fields.status]
 * @param {number} [fields.online]
 * @param {number} [fields.vbus_type]
 * @param {number} [fields.charge_current]
 * @param {number} [fields.temp]
 * @param {number} [fields.capacity]
 * @param {number} [fields.health]
 * @param {number} [fields.battery_present]
 * @param {number} [fields.voltagenow]
 * @param {number} [fields.voltagemax]
 * @param {number} [fields.voltagemin]
 * @param {number} [fields.currentnow]
 * @param {number} [fields.time_to_empty_now]
 * @param {number} [fields.time_to_empty_avg]
 * @param {number} [fields.time_to_full]
 * @param {number} [fields.charge_full]
 * @param {number} [fields.energy_avg]
 */
var BatteryState = ffi.Struct(fields)
batter.BatteryState = BatteryState;
module.exports = battery;

