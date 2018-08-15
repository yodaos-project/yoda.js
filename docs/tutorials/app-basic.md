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
};
```

The above function receives an argument `app`, which includes the following methods:

- `tts`
  - `speak(text)`: speak the text.
  - `stop()`: cancel the speaking.
- `media`
  - `start(url, cb)` play the url.
  - `pause()` pause the playback.
  - `resume()` resume the playback.
  - `stop()` stop the playback.
- `light`
  - `play(name)` play the light by the given name.
  - `stop()` stop the current light.
- `localStorage` the local storage.
  - `getItem(key)` get the value by the given key.
  - `setItem(key)` set the value by the given key.
- `setPickup(f)` set if the pickup state.
- `setConfirm(intent, slot, options)` set if the confirm state.
- `exit()` exits the current application.
- `exitAll()` exits the current application and clean up others.

The following are convenient methods:

- `playSound(name)` play the local sound effect by the given name.

