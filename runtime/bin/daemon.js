#!/usr/bin/env node

'use strict';

require('../lib/runtime')([
  '/opt/apps', 
  '/data/apps'
]).start();

// just manually gc per 5minutes
setInterval(() => {
  if (typeof gc === 'function') {
    gc();
  }
}, 5 * 60 * 1000);
