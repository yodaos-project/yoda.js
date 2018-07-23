'use strict';

function Proxy(bus, options) {
  this.options = options;
  this.bus = bus;
}

Proxy.prototype.invoke = function (name, args) {
  return new Promise((resolve, reject) => {
    var sig = args.map(() => 's').join('');
    this.bus.callMethod(
      this.options.dbusService,
      this.options.dbusObjectPath,
      this.options.dbusInterface,
      name, sig, args, function (res) {
        resolve(res);
      });
  });
};

module.exports = Proxy;