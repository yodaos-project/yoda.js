'use strict';

var LOG_PORT = 19788;
var net = require('net');
var util = require('util');
var id = 0;

function LiveRemote() {
  this._sockets = [];
  this._server = null;
  this.start();
}

LiveRemote.prototype.start = function() {
  this._server = net.createServer(
    this.onsocket.bind(this)
  ).on('error', (err) => {
    console.error(err && err.stack);
    this._server.close();
  });
  this._server.listen(LOG_PORT);
};

LiveRemote.prototype.onsocket = function() {
  var obj = { id: id++, socket: socket };
  this._sockets.push(obj);
  socket.on('close', () => {
    this._sockets = this._sockets.filter((item) => {
      return item.id !== obj.id;
    });
  });
};

LiveRemote.prototype.write = function(line) {
  for (var i = 0; i < this._sockets.length; i++) {
    this._sockets[i].socket.write(line);
  }
};

function Logger(name) {
  this.liveRemote = null;
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
    this.liveRemote.write(`[${now}] ${level} ${line}`);
    console[level](line);
  };
}

Logger.prototype.log = createLoggerFunction('info');
Logger.prototype.info = createLoggerFunction('info');
Logger.prototype.warn = createLoggerFunction('warn');
Logger.prototype.error = createLoggerFunction('error');

var liveRemote = new LiveRemote();

module.exports = function(name) {
  var logger = new Logger(name);
  logger.liveRemote = liveRemote;
  return logger;
};