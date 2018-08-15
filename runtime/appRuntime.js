var fs = require('fs');
var dbus = require('dbus');
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;

var Permission = require('./component/permission');
var TTS = require('./component/tts');
var AppExecutor = require('./app/executor');

var logger = require('logger')('ROS');

module.exports = App;

function App(arr) {
  EventEmitter.call(this);
  // App Executor
  this.apps = {};
  // 保存正在运行的AppID
  this.appIdStack = [];
  // 保存正在运行的App Map, 以AppID为key
  this.appMap = {};
  // save the real appid
  this.appIdOriginStack = [];
  // 保存正在运行的App的data, 以AppID为key
  this.appDataMap = {};
  // save the skill's id domain
  this.domain = {
    cut: '',
    scene: ''
  };
  // manager app's permission
  this.permission = new Permission(this);

  // 加载APP
  this.loadApp(arr, function () {
    logger.log('load app complete');
  });
  // volume module
  this.volume = null;
  this.prevVolume = -1;
  this.handle = {};
  // to identify the first start
  this.online = undefined;

  // this.dbusClient = dbus.getBus('session');
  // 启动extapp dbus接口
  this.startExtappService();
  // 处理mqtt事件
  this.handleMqttMessage();

}
inherits(App, EventEmitter);

/**
 * 根据应用包安装目录加载所有应用
 * @param {string[]} paths 应用包的安装目录
 * @param {function} cb 加载完成的回调，回调没有参数
 */
App.prototype.loadApp = function (paths, cb) {
  var self = this;

  // 根据目录读取目录下所有的App包，返回的是App的包路径
  var loadAppDir = function (dirs, cb) {
    // 检查参数
    if (dirs.length <= 0) {
      cb([]);
      return;
    }
    // 保存所有的App目录
    var appRoot = [];
    // 读取文件夹，递归调用，不读取子目录
    var readDir = function (index) {
      fs.readdir(dirs[index], function (err, files) {
        if (err) {
          logger.log('read dir error: ', dirs[index]);
        } else {
          files.map(function (name) {
            if (name === '.' || name === '..') {
              return;
            }
            appRoot.push(dirs[index] + '/' + name);
          });
        }
        index++;
        if (index < paths.length) {
          readDir(index);
        } else {
          // 读取完成回调
          cb(appRoot);
        }
      });
    }
    readDir(0);
  };
  // 读取目录并加载APP
  loadAppDir(paths, function (apps) {
    // 检查目录下是否有App包
    if (apps.length <= 0) {
      logger.log('no app load');
      cb();
      return;
    }
    logger.log('load app num: ', apps.length);
    // 加载APP
    var loadApp = function (index) {
      self.load(apps[index], function (err, metadata) {
        if (err) {
          // logger.log('load app error: ', err);
        }
        index++;
        if (index < apps.length) {
          loadApp(index);
        } else {
          // 加载完成回调
          cb();
        }
      });
    };
    loadApp(0);
  });
};

/**
 * 根据应用的包路径加载应用
 * @param {string} root 应用的包路径
 * @param {string} name 应用的包名字
 * @param {function} cb 加载完成的回调: (err, metadata)
 * @return {object} 应用的appMetaData
 */
App.prototype.load = function (root, cb) {
  var prefix = root;
  var pkgInfo;
  var app;
  fs.readFile(prefix + '/package.json', 'utf8', (err, data) => {
    if (err) {
      cb(err);
    } else {
      pkgInfo = JSON.parse(data);
      if (pkgInfo.metadata && pkgInfo.metadata.skills) {
        for (var i in pkgInfo.metadata.skills) {
          var id = pkgInfo.metadata.skills[i];
          // 加载权限配置
          this.permission.load(id, pkgInfo.metadata.permission || []);
          if (this.apps[id]) {
            // 打印调试信息
            logger.log('load app path: ', prefix);
            logger.log('skill id: ', id);
            throw new Error('skill conflicts');
          }
          app = new AppExecutor(pkgInfo, prefix);
          if (app.valid) {
            app.skills = pkgInfo.metadata.skills;
            this.apps[id] = app;
          } else {
            cb(app.errmsg);
            return;
          }
        }
        cb(null, {
          pathname: prefix,
          metadata: pkgInfo.metadata
        });
      } else {
        cb(new Error('invalid app format: ' + root));
      }
    }
  });
};

/**
 * 接收turen的speech事件
 * @param {string} name 
 * @param {object} data 
 */
App.prototype.onEvent = function (name, data) {
  console.log(name);
  var min = 30;
  var volume = this.volume.get();
  if (name === 'voice coming') {
    if (volume > min) {
      this.prevVolume = volume;
      this.volume.set(min);
      this.handle.setVolume = setTimeout(() => {
        this.volume.set(volume);
      }, 6000);
    }
    this.lightMethod('setAwake', ['']);
  } else if (name === 'voice local awake') {
    this.lightMethod('setDegree', ['', '' + (data.sl || 0)]);
  } else if (name === 'asr pending') {

  } else if (name === 'asr end') {
    this.lightMethod('setLoading', ['']);
  } else if (name === 'nlp') {
    clearTimeout(this.handle.setVolume);
    if (this.prevVolume > 0) {
      this.volume.set(this.prevVolume);
    }
    this.lightMethod('setHide', ['']);
    this.onVoiceCommand(data.asr, data.nlp, data.action);
  } else if (name === 'connected') {
    this.destroyAll();
    clearTimeout(this.handle.networkApp);
    if (this.online === false || this.online === undefined) {
      // need to play startup music
      logger.log('first startup');
      this.onReconnected();
      this.emit('reconnected');
    }
    this.online = true;
  } else if (name === 'disconnected') {
    logger.log('network disconnected, please connect to wifi first');
    clearTimeout(this.handle.networkApp);
    var self = this;
    // trigger disconnected event when network state is switched or when it is first activated.
    if (this.online === true || this.online === undefined) {
      // start network app here
      this.onDisconnected();
      this.emit('disconnected');
    }
    this.online = false;
  }
};

/**
 * 解析服务端返回的NLP，并执行App生命周期
 * @param {string} asr 语音识别后的文字
 * @param {object} nlp 服务端返回的NLP
 * @param {object} action 服务端返回的action
 */
App.prototype.onVoiceCommand = function (asr, nlp, action) {
  var data = {};
  var appId;
  try {
    // for appDataMap
    appId = nlp.cloud === true ? '@cloud' : nlp.appId;
    data = {
      appId: nlp.appId,
      cloud: nlp.cloud,
      form: action.response.action.form,
      nlp: nlp,
      action: action
    }
  } catch (error) {
    logger.log('invalid nlp/action, ignore');
    return;
  }
  // 命中的是当前运行的App
  if (appId === this.getCurrentAppId()) {
    this.lifeCycle('onrequest', data);
  } else {
    // 如果当前NLP是scene，则退出所有App
    if (data.form === 'scene') {
      logger.log('debug: destroy all app');
      this.destroyAll();
    } else {
      var last = this.getCurrentAppData();
      if (last) {
        // 如果正在运行的App不是scene，则停止该App
        if (last.form !== 'scene') {
          logger.log('debug: destroy current app');
          this.lifeCycle('destroy', last);
          // 否则暂停该App
        } else {
          logger.log('debug: pause current app');
          this.lifeCycle('pause', last);
        }
      }
    }
    // 启动App
    this.lifeCycle('create', data).then((app) => {
      this.lifeCycle('onrequest', data);
    }).catch((error) => {
      logger.error('create app error with appId:' + appId);
      logger.error(error);
    });
  }
};

/**
 * 返回App是否在运行栈中
 * @param {string} appId App的AppID
 * @return {boolean} 在appIdStack中返回true，否则false
 */
App.prototype.isAppAlive = function (appId) {
  for (var i = 0; i < this.appIdStack.length; i++) {
    if (appId === this.appIdStack[i]) {
      return true;
    }
  }
  return false;
};

/**
 * 获取当前运行的appId，如果没有则返回false
 * @return {string} appId
 */
App.prototype.getCurrentAppId = function () {
  if (this.appIdStack.length <= 0) {
    return false;
  }
  return this.appIdStack[this.appIdStack.length - 1];
};

/**
 * 获取当前App的data，如果没有则返回false
 * @return {object} App的appData
 */
App.prototype.getCurrentAppData = function () {
  if (this.appIdStack.length <= 0) {
    return false;
  }
  return this.appDataMap[this.getCurrentAppId()];
};

/**
 * 获取指定的AppData，如果没有则返回false
 * @param {string} appId App的AppID
 * @return {object} App的appData
 */
App.prototype.getAppDataById = function (appId) {
  return this.appDataMap[appId] || false;
};

/**
 * 获取当前运行的App，如果没有则返回false
 * @return {object} App实例
 */
App.prototype.getCurrentApp = function () {
  if (this.appIdStack.length <= 0) {
    return false;
  }
  return this.appMap[this.getCurrentAppId()];
};

/**
 * 给所有App发送destroy事件，销毁所有App
 */
App.prototype.destroyAll = function () {
  // 依次给正在运行的App发送destroy命令
  for (var i = 0; i < this.appIdStack.length; i++) {
    if (this.appMap[this.appIdStack[i]]) {
      this.appMap[this.appIdStack[i]].emit('destroy');
    }
  }
  // 清空正在运行的所有App
  this.appIdStack = [];
  this.appMap = {};
  this.appIdOriginStack = [];
  this.appDataMap = {};
};

/**
 * 执行App的生命周期
 * @param {string} name 生命周期名字
 * @param {object} AppData 服务端返回的NLP
 * @returns {promise} Lifecycle events may be asynchronous
 */
App.prototype.lifeCycle = function (name, AppData) {
  logger.log('lifeCycle: ', name);
  var appId = AppData.cloud === true ? '@cloud' : AppData.appId;
  var app = null;
  if (name === 'create') {
    // 启动应用
    if (this.apps[appId]) {
      return this.apps[appId].create(appId, this)
        .then((app) => {
          if (app) {
            // 执行create生命周期
            app.emit('create', AppData.nlp, AppData.action);
            // 当前App正在运行
            this.appIdStack.push(appId);
            this.appMap[appId] = app;
            this.appDataMap[appId] = AppData;
          }
        });
    } else {
      // fix: should create miss app here
      logger.log('not find appid: ', appId);
    }
  } else {
    app = this.getCurrentApp();
    if (app === false) {
      return Promise.reject(new Error('app instance not found, you should wait for creation of a lifecycle event to complete'));
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
    this.deleteAppById(AppData.appId);
  }
  this.updateStack(AppData);
  return Promise.resolve();
};

/**
 * 更新App stack
 */
App.prototype.updateStack = function (AppData) {
  // var scene = '';
  // var cut = '';

  // logger.log('stack', this.appIdStack);
  // for (var i = this.appIdOriginStack.length - 1; i >= 0; i--) {
  //   AppData = this.getAppDataById(this.appIdOriginStack[i]);
  //   if (scene === '' && AppData.form === 'scene') {
  //     scene = AppData.appId;
  //   }
  //   if (cut === '' && AppData.form !== 'scene') {
  //     cut = AppData.appId;
  //   }
  // }
  logger.log('AppData.appId: ' + AppData.appId + ' form: ' + AppData.form);
  if (AppData.form === 'cut') {
    this.domain.cut = AppData.appId;
  }
  if (AppData.form === 'scene') {
    this.domain.scene = AppData.appId;
  }
  logger.log('domain', this.domain);
  this.emit('setStack', this.domain.scene + ':' + this.domain.cut);
};

/**
 * 调用speech的pickup
 * @param {boolean} isPickup 
 */
App.prototype.setPickup = function (isPickup) {
  this.emit('setPickup', isPickup);
};

/**
 * 退出App。由应用自身在退出时手动调用，向系统表明该应用可以被销毁了
 * @param {string} appId extapp的AppID
 */
App.prototype.exitAppById = function (appId) {
  // 调用生命周期结束该应用
  this.lifeCycle('destroy', {
    appId: appId
  });
  // 如果上一个应用是scene，则需要resume恢复运行
  var last = this.getCurrentAppData();
  if (last && last.form === 'scene') {
    this.lifeCycle('resume', last);
  }
};

App.prototype.exitAppByIdForce = function (appId) {
  this.deleteAppById(appId);
  var last = this.getCurrentAppData();
  if (last && last.form === 'scene') {
    this.lifeCycle('resume', last);
  }
};

App.prototype.deleteAppById = function (appId) {
  // 删除指定AppID
  for (var i = 0; i < this.appIdStack.length; i++) {
    if (this.appIdStack[i] === appId) {
      this.appIdStack.splice(i, 1);
      break;
    }
  }
  // 释放该应用
  delete this.appMap[appId];
  delete this.appDataMap[appId];
};

/**
 * 通过dbus注册extapp
 * @param {string} appId extapp的AppID
 * @param {object} profile extapp的profile
 */
App.prototype.registerExtApp = function (appId, profile) {
  logger.log('register extapp with id: ', appId);
  // 配置exitApp的默认权限
  this.permission.load(appId, ['ACCESS_TTS', 'ACCESS_MULTIMEDIA']);
  this.apps[appId] = new AppExecutor(profile);
};

/**
 * 删除extapp
 * @param {string} appId 
 */
App.prototype.deleteExtApp = function (appId) {

};

/**
 * mock nlp response
 * @param {object} nlp 
 * @param {object} action 
 */
App.prototype.mockNLPResponse = function (nlp, action) {
  var AppData;
  if (nlp.appId === this.getCurrentAppId()) {
    AppData = {
      appId: nlp.appId,
      cloud: nlp.cloud,
      form: action.response.action.form,
      nlp: nlp,
      action: action
    };
    this.lifeCycle('onrequest', AppData);
  }
};

App.prototype.startApp = function (appId, nlp, action) {
  nlp.cloud = false;
  nlp.appId = appId;
  action = {
    appId: appId,
    startWithActiveWord: false,
    response: {
      action: action || {}
    }
  };
  action.response.action.appId = appId;
  action.response.action.form = 'cut';
  this.onVoiceCommand('', nlp, action);
};

/**
 * 接收Mqtt的topic
 * @param {string} topic
 * @param {string} message
 */
App.prototype.onMqttMessage = function (topic, message) {
  this.emit(topic, message);
};

/**
 * 处理Mqtt的topic
 */
App.prototype.handleMqttMessage = function () {
  this.on('cloud_forward', this.onCloudForward.bind(this));
  this.on('reset_settings', this.onResetSettings.bind(this));
};

/**
 * 处理App发送过来的模拟NLP
 * @param {string} message 
 */
App.prototype.onCloudForward = function (message) {
  try {
    var msg = JSON.parse(message);
    var params = JSON.parse(msg.content.params);
    // 模拟nlp
    this.onVoiceCommand('', params.nlp, params.action);
  } catch (err) {
    logger.error(err && err.stack);
  }
};

/**
 * 处理App发送的恢复出厂设置
 * @param {string} message 
 */
App.prototype.onResetSettings = function (message) {
  if (data === '1') {
    logger.log('当前不支持恢复出厂设置');
  }
};

App.prototype.lightMethod = function (name, args) {
  return new Promise((resolve, reject) => {
    var sig = args.map(() => 's').join('');
    this.service._dbus.callMethod(
      'com.service.light',
      '/rokid/light',
      'com.rokid.light.key',
      name, sig, args, function (res) {
        resolve(res);
      });
  });
};

App.prototype.ttsMethod = function (name, args) {
  return new Promise((resolve, reject) => {
    var sig = args.map(() => 's').join('');
    this.service._dbus.callMethod(
      'com.service.tts',
      '/tts/service',
      'tts.service',
      name, sig, args, function (res) {
        resolve(res);
      });
  });
};

/** interface  */

App.prototype.onGetPropAll = function () {
  return {};
};


App.prototype.onReconnected = function () {
  this.lightMethod('setConfigFree', []);
};

App.prototype.onDisconnected = function () {
  this.startApp('@network', {}, {});
};

App.prototype.onReLogin = function () {
  this.lightMethod('setWelcome', []);

  var config = JSON.stringify(this.onGetPropAll());
  this.ttsMethod('connect', [config])
    .then((res) => {
      logger.log(`send CONFIG to ttsd: ${res[0]}`);
    });
};

/**
 * 启动extApp dbus接口
 */
App.prototype.startExtappService = function () {
  var self = this;
  var service = dbus.registerService('session', 'com.rokid.AmsExport');
  var extappObject = service.createObject('/activation/extapp');
  var extappApis = extappObject.createInterface('com.rokid.activation.extapp');
  // used for extapp type
  this.service = service;

  extappApis.addMethod('register', {
    in: ['s', 's', 's'],
    out: []
  }, function (appId, objectPath, ifaceName, cb) {
    self.registerExtApp(appId, {
      metadata: {
        extapp: true,
        daemon: true,
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
  }, function (appId, cb) {
    self.deleteExtApp(appId);
    cb(null);
  });
  extappApis.addMethod('start', {
    in: ['s'],
    out: []
  }, function (appId, cb) {
    cb(null);
  });
  extappApis.addMethod('setPickup', {
    in: ['s', 's'],
    out: []
  }, function (appId, isPickup, cb) {
    if (appId !== self.getCurrentAppId()) {
      logger.log('set pickup permission deny');
      cb(null);
    } else {
      self.setPickup(isPickup === 'true' ? true : false);
      cb(null);
    }
  });
  extappApis.addMethod('exit', {
    in: ['s'],
    out: []
  }, function (appId, cb) {
    if (appId !== self.getCurrentAppId()) {
      logger.log('exit app permission deny');
      cb(null);
    } else {
      self.exitAppByIdForce(appId);
      cb(null);
    }
  });
  extappApis.addMethod('mockNLPResponse', {
    in: ['s', 's', 's'],
    out: []
  }, function (appId, nlp, action, cb) {
    cb(null);
    try {
      nlp = JSON.parse(nlp);
      action = JSON.parse(action);
    } catch (error) {
      logger.log('mockNLPResponse, invalid nlp or action');
      return;
    }
    self.mockNLPResponse(nlp, action);
  });
  extappApis.update();

  var permitObject = service.createObject('/com/permission');
  var permitApis = permitObject.createInterface('com.rokid.permission');

  permitApis.addMethod('check', {
    in: ['s', 's'],
    out: ['s']
  }, function (appId, name, cb) {
    var permit = self.permission.check(appId, name);
    logger.log('vui.permit', permit, appId, name);
    if (permit) {
      cb(null, 'true');
    } else {
      cb(new Error('permission deny'), 'false');
    }
  });
  permitApis.update();

  // amsExport
  var openvoiceObject = service.createObject('/rokid/openvoice');
  var openvoiceApis = openvoiceObject.createInterface('rokid.openvoice.AmsExport');
  openvoiceApis.addMethod('ReportSysStatus', {
    in: ['s'],
    out: ['b'],
  }, function (status, cb) {
    try {
      var data = JSON.parse(status);
      if (data.upgrade === true) {
        self.startApp('@upgrade', {}, {});
      } else if (data['Wifi'] === false || data['Network'] === false) {
        self.onEvent('disconnected', {});
      } else if (data['Network'] === true && !self.online) {
        self.onEvent('connected', {});
      }
      cb(null, true);
    } catch (err) {
      logger.error(err && err.stack);
      cb(null, false);
    }
  });
  openvoiceApis.addMethod('SetTesting', {
    in: ['s'],
    out: ['b'],
  }, function (testing, cb) {
    logger.log('set testing' + testing);
    cb(null, true);
  });
  openvoiceApis.addMethod('SendIntentRequest', {
    in: ['s', 's', 's'],
    out: ['b']
  }, function (asr, nlp, action, cb) {
    console.log('sendintent', asr, nlp, action);
    self.onEvent('nlp', {
      asr: asr,
      nlp: nlp,
      action: action
    });
    cb(null, true);
  });
  openvoiceApis.addMethod('Reload', {
    in: [],
    out: ['b']
  }, function (cb) {
    cb(null, true);
  });
  openvoiceApis.addMethod('Ping', {
    in: [],
    out: ['b']
  }, function (cb) {
    logger.log('YodaOS is alive');
    cb(null, true);
  });
  openvoiceApis.update();

  // prop object
  var propObject = service.createObject('/activation/prop');
  var propApis = propObject.createInterface('com.rokid.activation.prop');
  propApis.addMethod('all', {
    in: ['s'],
    out: ['s'],
  }, function (appId, cb) {
    var config = self.onGetPropAll();
    cb(null, JSON.stringify({
      deviceId: config.device_id,
      appSecret: config.secret,
      masterId: property.get('persist.system.user.userId'),
      deviceTypeId: config.device_type_id,
      key: config.key,
      secret: config.secret,
    }));
  });
  propApis.update();
};
