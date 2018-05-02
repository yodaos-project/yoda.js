'use strict';

const LumenRuntime = require('./lib/runtime').LumenRuntime;

let runtime = new LumenRuntime();
require('./lib/effects/round')(runtime);
require('./lib/effects/blink')(runtime);
require('./lib/effects/point')(runtime);

module.exports = runtime;
