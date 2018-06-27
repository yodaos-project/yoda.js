var fs = require('fs');
var dbus = require('dbus');
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;

var Permission = require('./component/permission');
var TTS = require('./component/tts');
var AppExecutor = require('./app/executor');

module.exports = APP;

function APP(arr) {
    EventEmitter.call(this);
    // App Executor
    this.apps = {};
    this.appMetaList = [];
    // 保存正在运行的AppID
    this.appIdStack = [];
    // 保存正在运行的App Map, 以AppID为key
    this.appMap = {};
    // 保存正在运行的App的dat, 以AppID为key
    this.appDataMap = {};
    // 权限管理模块
    this.permission = new Permission(this);
    // component
    this.tts = new TTS(this.permission);
    // 加载APP
    this.appMetaList = this.loadApp(arr);
    // 启动extapp dbus接口
    this.startExtappService();
}
inherits(APP, EventEmitter);

// 根据路径加载应用
APP.prototype.loadApp = function (paths) {
    var self = this;
    this.appMetaList = paths.reduce(function (appMeta, pathname) {
        if (fs.existsSync(pathname)) {
            appMeta = appMeta.concat(
                fs.readdirSync(pathname).map(function (name) {
                    return self.load(pathname, name);
                })
            );
        }
        return appMeta;
    }, []);
}
// 对每个应用的skill创建执行器
APP.prototype.load = function (root, name) {
    var prefix = root + '/' + name;
    var pkgInfo = require(prefix + '/package.json');
    var app;
    console.log('load app in ', prefix, pkgInfo);
    for (var i in pkgInfo.metadata.skills) {
        var id = pkgInfo.metadata.skills[i];
        // 加载权限配置
        this.permission.load(id, pkgInfo.metadata.permission || []);
        
        if (this.apps[id]) {
            throw new Error('skill conflicts');
        }
        app = new AppExecutor(pkgInfo, prefix);
        if (app.valid) {
            app.skills = pkgInfo.metadata.skills;
            this.apps[id] = app;
        } else {
            throw new Error(app.errmsg);
        }
    }
    return {
        pathname: prefix,
        metadata: pkgInfo.metadata,
    };
}
// 接收speech事件
APP.prototype.onEvent = function(name, data) {
    if (name === 'voice coming') {
        
    } else if (name === 'voice accept') {
        
    } else if (name === 'asr end') {
        
    } else if (name === 'nlp') {
        this.onVoiceCommand(data.asr, data.nlp, data.action);
    }
}
// 解析NLP命令
APP.prototype.onVoiceCommand = function (asr, nlp, action) {
    var data = {};
    
    try {
        data = {
            appId: nlp.appId,
            cloud: nlp.cloud,
            form: action.response.action.form,
            nlp: nlp,
            action: action
        }
    } catch (error) {
        console.log('invalid nlp/action, ignore');
        return;
    }
    // 命中的是当前运行的App
    if (data.appId === this.getCurrentAppId()) {
        this.lifeCycle('onrequest', data);
    }else{
        // 如果当前NLP是scene，则退出所有App
        if (data.form === 'scene') {
            console.log('debug: destroy all app');
            this.destroyAll();
        }else{
            var last = this.getCurrentAppData();
            if (last) {
                // 如果正在运行的App不是scene，则停止该App
                if (last.form !== 'scene') {
                    console.log('debug: destroy current app');
                    this.lifeCycle('destroy', last);
                    // 否则暂停该App
                }else{
                    console.log('debug: pause current app');
                    this.lifeCycle('pause', last);
                }
            }
        }
        // 启动App
        this.lifeCycle('create', data);
        this.lifeCycle('onrequest', data);
    }
}
/**
 * 返回App是否运行中
 * @param {string} appId 
 */
APP.prototype.isAppAlive = function(appId) {
    for(var i = 0; i < this.appIdStack.length; i++) {
        if (appId === this.appIdStack[i]) {
            return true;
        }
    }
    return false;
}
// 获取当前运行的appId
APP.prototype.getCurrentAppId = function () {
    if (this.appIdStack.length <= 0) {
        return false;
    }
    return this.appIdStack[this.appIdStack.length - 1];
}
// 获取当前App的data
APP.prototype.getCurrentAppData = function () {
    if (this.appIdStack.length <= 0) {
        return false;
    }
    return this.appDataMap[this.getCurrentAppId()];
}
// 获取制定的AppData
APP.prototype.getAppDataById = function (appId) {
    return this.appDataMap[appId] || false;
}
// 获取当前运行的App
APP.prototype.getCurrentApp = function () {
    if (this.appIdStack.length <= 0) {
        return false;
    }
    return this.appMap[this.getCurrentAppId()];
}
APP.prototype.destroyAll = function () {
    // 依次给正在运行的App发送destroy命令
    for(var i=0; i<this.appIdStack.length; i++) {
        if (this.appMap[this.appIdStack[i]]) {
            this.appMap[this.appIdStack[i]].emit('destroy');
        }
    }
    // 清空正在运行的所有App
    this.appIdStack = [];
    this.appMap = {};
    this.appDataMap = {};
}
// App生命周期
APP.prototype.lifeCycle = function (name, AppData) {
    console.log('lifeCycle: ', name);
    // 注意创建应用实例的时候，是使用@cloud的。后续操作都使用NLP的AppID
    var appId = AppData.cloud === true ? '@cloud' : AppData.appId;
    var app = null;
    if (name === 'create') {
        // 启动应用
        if (this.apps[appId]) {
            app = this.apps[appId].create(AppData.appId, this);
            if (app) {
                // 执行create生命周期
                app.emit('create', AppData.nlp, AppData.action);
                // 当前App正在运行
                this.appIdStack.push(AppData.appId);
                this.appMap[AppData.appId] = app;
                this.appDataMap[AppData.appId] = AppData;
            }
        }else{
            console.log('not find appid: ', appId);
        }
    }else{
        app = this.getCurrentApp();
        if (app === false) {
            return;
        }
    }
    
    if (name === 'onrequest') {
        app.emit('voice_command', AppData.nlp, AppData.action);
    }
    if (name === 'pause') {
        app.emit('pause');
    }
    if (name === 'resume') {
        app.emit('resume');
    }
    if (name === 'destroy') {
        app.emit('destroy');
        // 删除指定AppID
        for(var i=0; i<this.appIdStack.length; i++) {
            if (this.appIdStack[i] === AppData.appId) {
                this.appIdStack.splice(i, 1);
                break;
            }
        }
        // 释放该应用
        delete this.appMap[AppData.appId];
        delete this.appDataMap[AppData.appId];
    }
    this.updateStack();
}
APP.prototype.updateStack = function () {
    var scene = '';
    var cut = '';
    var AppData;
    for(var i = this.appIdStack.length - 1; i >= 0; i--) {
        AppData = this.getAppDataById(this.appIdStack[i]);
        if (scene === '' && AppData.form === 'scene') {
            scene = AppData.appId;
        }
        if (cut === '' && AppData.form !== 'scene') {
            cut = AppData.appId;
        }
    }
    this.emit('setStack', scene + ':' + cut);
}
// 退出App。由应用自身在退出时手动调用，向系统表明该应用可以被销毁了
APP.prototype.exitAppById = function (appId) {
    // 调用生命周期结束该应用
    this.lifeCycle('destroy', {
        appId: appId
    });
    // 如果上一个应用是scene，则需要resume恢复运行
    var last = this.getCurrentAppData();
    if (last && last.form === 'scene') {
        this.lifeCycle('resume', last);
    }
}
// 通过dbus注册extapp
APP.prototype.registerExtApp = function (appId, profile) {
    // 配置exitApp的默认权限
    this.permission.load(appId, ['tts', 'audio']);
    this.apps[appId] = new AppExecutor(profile);
}
APP.prototype.deleteExtApp = function (appId) {
    
}
// 启动extApp dbus接口
APP.prototype.startExtappService = function () {
    var self = this;
    var service = dbus.registerService('session', 'com.rokid.AmsExport');
    var extappObject = service.createObject('/activation/extapp');
    var extappApis = extappObject.createInterface('com.rokid.activation.extapp');
    
    extappApis.addMethod('register', {
        in: ['s', 's', 's'],
        out: []
    }, function(appId, objectPath, ifaceName, cb){
        self.registerExtApp(appId, {
            metadata: {
                extapp: true,
                dbusConn: {
                    objectPath: objectPath,
                    ifaceName: ifaceName
                }
            }
        });
        cb(null);
    });
    extappApis.addMethod('destroy', {
        in: ['s'],
        out: []
    }, function(appId, cb){
        self.deleteExtApp(appId);
        cb(null);
    });
    extappApis.addMethod('start', {
        in: ['s'],
        out: []
    }, function(appId, cb){
        cb(null);
    });
    extappApis.addMethod('exit', {
        in: ['s'],
        out: []
    }, function(appId, cb){
        if (appId !== self.getCurrentAppId()) {
            cb(new Error('appid is not at stack'));
        }else{
            self.lifeCycle('destroy', {
                appId: appId
            });
            cb(null);
        }
    });
    extappApis.update();
}
