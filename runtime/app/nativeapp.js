const dbus = require('dbus');
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;

function NativeApp(appId) {
    EventEmitter.call(this);
    this.appId = appId;
    this.app = null;

    this.bus = dbus.getBus('session');
    this.DBUS_SERVICE = 'rokid.openvoice.X' + this.appId;
    this.NATIVE_OBJECT = '/rokid/openvoice';
    this.NATIVE_INTERFACE = 'rokid.openvoice.NativeBase';
}
inherits(NativeApp, EventEmitter);

// 启动native App，监听dbus event
NativeApp.prototype.start = function () {
    var self = this;
    this.listenDbus().then(function(){

    });
}
// 监听生命周期事件
NativeApp.prototype.listenLifeCycle = function () {
    this.on('create', function(){
        
    });
}
// 监听dbus signal
NativeApp.prototype.listenDbus = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.bus.getUniqueServiceName(self.DBUS_SERVICE, (err, uniqueName) => {
            if (err) return reject(err);
            resolve(uniqueName);
        });
    }).then(function (uniqueName) {
        return Promise.all([
            self.addSignalFilter(uniqueName, self.NATIVE_OBJECT, self.NATIVE_INTERFACE)
        ]);
    }).then(function(uniqueNames) {
        var uniqueName = uniqueNames[0];
        var channel = uniqueName + ':' + self.NATIVE_OBJECT + ':' + self.NATIVE_INTERFACE;
        self.bus.on(channel, function(message){
            // emit event
            self.emit(message.name, message.args);
        });
    });
}
// add signal filter
NativeApp.prototype.addSignalFilter = function (uniqueName, object, dbusInterface) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.bus.addSignalFilter(uniqueName, object, dbusInterface, function (err) {
            if (err) return reject(err);
            resolve(uniqueName);
        });
    });
}