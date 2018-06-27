var dbus = require('dbus');
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;

function Permission (app_runtime) {
    EventEmitter.call(this);
    this.app_runtime = app_runtime;
    // 保存App的权限配置，{appId: permission}
    this.permission = {};
}
inherits(Permission, EventEmitter);

/**
 * 添加应用权限配置
 * @param {string} appId 应用ID
 * @param {array} permission 权限配置
 */
Permission.prototype.load = function(appId, permission) {
    if (appId !== undefined) {
        this.permission[appId] = {};
        for(var i = 0; i < permission.length; i++) {
            this.permission[appId][permission[i]] = true;
        }
    }
}

/**
 * 检查是否具有某个权限
 * @param {string} appId 
 * @param {string} name 
 */
Permission.prototype.check = function(appId, name) {
    if (appId === undefined || name === undefined) {
        return false;
    }
    // 判断App是否声明了权限
    if (this.permission[appId] && this.permission[appId][name] === true) {
        // 判断App是否运行 或者 是否具有中断权限
        return appId === this.app_runtime.getCurrentAppId() || this.permission[appId]['interrupt'] === true;
    }
    return false;
}

/**
 * 启动dbus服务
 */
Permission.prototype.startDbusService = function() {
    var self = this;
    var service = dbus.registerService('session', 'com.rokid.permission');
    var permitObject = service.createObject('/com/permission');
    var permitApis = permitObject.createInterface('com.rokid.permission');

    permitApis.addMethod('check', {
        in: ['s', 's'],
        out: ['s']
    }, function(appId, name, cb){
        var permit = self.check(appId, name);
        if (permit) {
            cb(null, 'true');
        }else{
            cb(new Error('permission deny'), 'false');
        }
    });
    permitApis.update();
}

module.exports = Permission;