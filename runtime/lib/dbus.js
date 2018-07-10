const util = require('util');
const dbus = require('dbus');
const EventEmitter = require('events').EventEmitter;

function DbusEvent(options) {
    EventEmitter.call(this);
    this.options = options
    this.dbusClient = dbus.getBus('session')
}
util.inherits(DbusEvent, EventEmitter);

DbusEvent.prototype.send = function (name, args) {
    this.dbusClient._dbus.emitSignal(
        this.dbusClient.connection,
        this.options.remoteObjectPath,
        this.options.remoteIfaceName,
        name,
        args,
        args.map(() => {
            return 's'
        })
    );
};