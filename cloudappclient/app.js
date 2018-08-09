var DbusAdapter = require('extapp').DbusAdapter;
var ExtAppService = require('extapp').ExtAppService;
var execute = require('./exe');
var eventRequest = require('./eventRequestApi');
var Manager = require('./manager');

// 创建一个service
var service = new ExtAppService(DbusAdapter, {
  dbusService: 'com.rokid.AmsExport',
  dbusObjectPath: '/extapp/test',
  dbusInterface: 'com.test.interface'
});

service.on('ready', () => {
  console.log('debug: service ready');
});
service.on('error', (err) => {
  console.log('debug: service ', err.stack);
});

// 创建一个extapp
var app = service.create('@cloud');
var exe = new execute();
// skill os
var sos = new Manager(exe);

exe.do('frontend', 'tts', function (dt, next) {
  if (dt.action === 'say') {
    app.media.pause();
    app.tts.say(dt.data.item.tts, function (name) {
      if (name === 'start') {
        if (dt.data.disableEvent === false) {
          eventRequest.ttsEvent('Voice.STARTED', dt.data.appId, dt.data.item.itemId);
        }
      } else if (name === 'end') {
        if (dt.data.disableEvent === false) {
          eventRequest.ttsEvent('Voice.FINISHED', dt.data.appId, dt.data.item.itemId, (response) => {
            // console.log('tts response', response);
            var action = JSON.parse(response);
            sos.append(null, action);
            // next();
          });
        } else {
          next();
        }
      } else if (name === 'cancel') {
        if (dt.data.disableEvent === false) {
          eventRequest.ttsEvent('Voice.FINISHED', dt.data.appId, dt.data.item.itemId, (response) => {
            console.log('tts response', response);
            var action = JSON.parse(response);
            sos.append(null, action);
            // next();
          });
        } else {
          next();
        }
      }
    });
  } else if (dt.action === 'cancel') {
    app.tts.cancel(function (error) {
      next();
      if (dt.data.disableEvent === false) {
        eventRequest.ttsEvent('Voice.FINISHED', dt.data.appId, dt.data.item.itemId, (response) => {
          // console.log('tts response', response);
        });
      }
    });
  }
});
exe.do('frontend', 'media', function (dt, next) {
  if (dt.action === 'play') {
    app.media.play(dt.data.item.url, function (name, args) {
      if (name === 'start') {
        if (dt.data.disableEvent === false) {
          eventRequest.mediaEvent('Media.STARTED', dt.data.appId, {
            itemId: dt.data.item.itemId,
            duration: args[0],
            progress: args[1]
          }, (response) => {
            // console.log('media response', response);
          });
        }
      } else if (name === 'end') {
        next();
        if (dt.data.disableEvent === false) {
          eventRequest.mediaEvent('Media.FINISHED', dt.data.appId, {
            itemId: dt.data.item.itemId,
            token: dt.data.item.token
          }, (response) => {
            // console.log('media response', response);
            var action = JSON.parse(response);
            app.mockNLPResponse(null, action);
          });
        }
      }
    });
  } else if (dt.action === 'pause') {
    app.media.pause(function (error) {
      next();
      if (dt.data.disableEvent === false) {
        eventRequest.mediaEvent('Media.PAUSED', dt.data.appId, {
          itemId: dt.data.item.itemId,
          token: dt.data.item.token
        });
      }
    });
  } else if (dt.action === 'resume') {
    app.media.resume(function (error) {
      next();
      if (dt.data.disableEvent === false) {
        eventRequest.mediaEvent('Media.STARTED', dt.data.appId, {
          itemId: dt.data.item.itemId,
          token: dt.data.item.token
        });
      }
    });
  } else if (dt.action === 'cancel') {
    app.media.cancel(function (error) {
      next();
      if (dt.data.disableEvent === false) {
        eventRequest.mediaEvent('Media.FINISHED', dt.data.appId, {
          itemId: dt.data.item.itemId,
          token: dt.data.item.token
        });
      }
    });
  }
});

app.on('ready', function () {
  console.log(this.getAppId() + ' app ready');
});

app.on('error', function (err) {
  console.log('app error: ', err);
});

app.on('created', function () {
  console.log(this.getAppId() + ' created');
});

app.on('paused', function () {
  console.log(this.getAppId() + ' paused');
});

app.on('resumed', function () {
  console.log(this.getAppId() + ' resumed');
});

app.on('onrequest', function (nlp, action) {
  // console.log(this.getAppId() + ' onrequest', nlp, action);
  sos.onrequest(nlp, action);
});

app.on('destroyed', function () {
  console.log(this.getAppId() + ' destroyed');
});
