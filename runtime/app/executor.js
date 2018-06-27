var fs = require('fs');
var ExtApp = require('./extapp.js');

// 应用执行器
function Executor(profile, prefix) {
    this.type = 'light';
    this.exec = null;
    this.errmsg = null;
    this.valid = false;
    this.connector = null;
    this.profile = profile;
    
    if (profile.metadata.native) {
        this.type = 'native';
        this.exec = prefix + '/' + (profile.main || 'runtime');
    } else if (profile.metadata.extapp) {
        this.type = 'extapp';
        this.exec = __dirname + '/extapp.js';
    } else {
        this.exec = prefix + '/app.js';
    }
    if (!fs.existsSync(this.exec)) {
        this.valid = false;
        this.errmsg = this.exec + ' not found';
    } else {
        this.valid = true;
    }
    // 加载静态APP，此时APP还没运行，只是个定义。实现多实例，互不干扰
    console.log('executor ', this.exec);
    this.connector = require(this.exec);
}
// 创建实例。runtime是Appruntime实例
Executor.prototype.create = function(appid, runtime){
    if (!this.valid) {
        console.log('app ' + appid + ' invalid');
        return false;
    }
    var app = null;
    if (this.type === 'light') {
        // 创建实例
        app = this.connector(appid, runtime);
    }else if (this.type === 'extapp') {
        app = new ExtApp(appid, this.profile.metadata.dbusConn, runtime);
    }
    return app;
}
module.exports = Executor;
