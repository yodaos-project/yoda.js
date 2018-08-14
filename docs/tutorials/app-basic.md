This tutorial shows how to create a voice-enabled skill application.

### Dependencies

- Node.js LTS.
- NPM.

### Steps

- Firstly, create a working directory.
- Initialize the project via `npm init`.
- Create `app.js`.

### Manifest

After `npm init`, you would get the following fields:

- `name` {String} the application name.
- `main` {String} the entry script.
- `manifest` {Object}
  - `skills` {Array} the skill ids.
  - `extapp` {Boolean} if this application is extapp.
  - `daemon` {Boolean} if this application is running in daemon.
  - `dbusConn` {Object} dbus connection config.
- `engine` {Object} specify the engine dependencies.
  - `shadow` {String} the version range of ShadowNode.
  - `yodaos` {String} the api level of YodaOS.
- `permissions` {Array} the permissions in this application.

### How to write app.js

We have the following 2 types application: lightapp and extapp. The workflow and API are consistent, and developers would
not need to modify any source code. The only difference is that if the code is running at the `vui-daemon` process.

For example, an extapp's manifest looks like the following:

```js
manifest: {
  "extapp": true,
  "daemon": false,
  "dbusConn": {
    "objectPath": "/extapp/network",
    "ifaceName": "com.extapp.network"
  },
  "skills": [
    "your appId"
  ]
}
```

lightapp is also dead simple as the following definition:

```js
manifest: {
  "skills": [ "Your AppId" ]
}
```

Next, we will see how to write the logic:

```js
module.exports = function(app) {
  app.on('created', () => {
    console.log('app created');
  });
  app.on('paused', () => {
    console.log('app paused');
  });
  app.on('resumed', () => {
    console.log('app resumed');
  });
  app.on('onrequest', (nlp, action) => {
    console.log(nlp, action);
  });
  app.on('destroyed', () => {
    console.log('app destroyed');
  });
}
```

The above function receives an argument `app`, which includes the following methods:

- `exit()` exits the current application.
- `destroyAll()` cleans the applications stack.
- `setPickup(f)` set if the pickup state.
- `tts`
  - `tts.say(text)`: speak the text.
  - `tts.cancel()`: cancel the speaking.
- `media`
  - `media.play(url, cb)` play the url.
  - `media.pause()` pause the playback.
  - `media.resume()` resume the playback.
  - `media.cancel()` stop the playback.
- `light`
  - `light.setStandby()` play standby light.
  - `light.sound(name)` play the sound by the given name.

