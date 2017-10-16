'use strict';

const AppDispatcher = require('/usr/lib/node_modules/@rokid/vui/build/Release/ams_down.node').AppDispatcher;
let dispatcher = new AppDispatcher((event, ...args) => {
  console.log(`<${event}>`, args);
});
dispatcher.bench(5);
