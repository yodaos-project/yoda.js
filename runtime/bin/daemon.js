#!/usr/bin/env node

'use strict';

require('../lib/runtime')([
  '/opt/apps', 
  '/data/apps'
]).start();