'use strict';
var util = require('util');
var id = 0;

function Logger(name) {
  if (!name) {
    name = 'syst';
  }
  if (name.length > 4) {
    name = name.slice(0, 4); 
  }

  // map for 1/2/3
  switch (name.length) {
    case 1: name = ` :${name} `; break;
    case 2: name = ` ${name} `; break;
    case 3: name = `:${name}`; break;
  }
  this.name = name;
}

function createLoggerFunction(level) {
  return function() {
    var now = new Date();
    var line = `<${this.name}> :: ` + util.format.apply(this, arguments);
    console[level](line);
  };
}

Logger.prototype.log = createLoggerFunction('info');
Logger.prototype.info = createLoggerFunction('info');
Logger.prototype.warn = createLoggerFunction('warn');
Logger.prototype.error = createLoggerFunction('error');

module.exports = function(name) {
  var logger = new Logger(name);
  // aliyun log?
  return logger;
};

