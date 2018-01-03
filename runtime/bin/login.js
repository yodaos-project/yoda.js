#!/usr/bin/env node

'use strict';

const apis = require('../lib/apis');
Promise.resolve()
  .then(() => apis.login())
  .then(() => apis.bindDevice())
  .then(() => {
    console.log('login success!');
    process.exit();
  });
