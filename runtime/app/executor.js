var fs = require('fs');
var fork = require('child_process').fork;
var ExtApp = require('./extapp.js');
var logger = require('logger')('executor');

// 应用执行器
function Executor(profile, prefix) {
  this.type = 'light';
  this.daemon = false;
  this.exec = null;
  this.errmsg = null;
  this.valid = false;
  this.connector = null;
  this.profile = profile;

  if (profile.metadata.native === true) {
    this.type = 'native';
    this.exec = prefix + '/' + (profile.main || 'index.js');
  } else if (profile.metadata.extapp === true) {
    if (profile.metadata.daemon === true) {
      this.daemon = true;
    }
    this.type = 'extapp';
    this.exec = prefix + '/' + (profile.main || 'index.js');
  } else {
    this.exec = prefix + '/app.js';
    this.connector = require(this.exec);
  }
  if (!fs.existsSync(this.exec)) {
    this.valid = false;
    this.errmsg = this.exec + ' not found';
  } else {
    this.valid = true;
  }
  // 加载静态APP，此时APP还没运行，只是个定义。实现多实例，互不干扰
  console.log('executor ', this.exec);
}
// 创建实例。runtime是Appruntime实例
Executor.prototype.create = function (appid, runtime) {
  if (!this.valid) {
    console.log('app ' + appid + ' invalid');
    return false;
  }
  var app = null;
  if (this.type === 'light') {
    // 创建实例
    app = this.connector(appid, runtime);
    return Promise.resolve(app);
  } else if (this.type === 'extapp') {
    // create extapp's sender
    app = new ExtApp(appid, this.profile.metadata.dbusConn, runtime);
    // run real extapp
    logger.log('fork extapp ' + this.exec);
    var handle = fork(this.exec, {
      env: {
        NODE_PATH: '/usr/lib'
      }
    });
    logger.log('fork complete');
    handle.on('exit', () => {
      logger.log(appid + ' exit');
    });
    return new Promise((resolve, reject) => {
      // a message will received after extapp is startup
      handle.on('message', (message, sender) => {
        if (message.ready === true) {
          resolve(app);
        } else {
          reject(new Error('an error occurred when starting the extapp'));
        }
      });
    });
  }
}
module.exports = Executor;
