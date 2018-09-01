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
  - `permission` {Array} the permissions in this application.
- `engine` {Object} specify the engine dependencies.
  - `shadow` {String} the version range of ShadowNode.
  - `yodaos` {String} the api level of YodaOS.

### How to write app.js

We have the following 2 types application: lightapp and extapp. The workflow and API are consistent, and developers would
not need to modify any source code. The only difference is that if the code is running at the `vui-daemon` process.

For example, an extapp's manifest looks like the following:

```js
manifest: {
  "extapp": true,
  "daemon": false,
  "skills": [
    "your appId"
  ],
  "permission": [
    "ACCESS_TTS",
    "ACCESS_SOUND",
    "ACCESS_LIGHT"
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
module.exports = function (activity) {
  activity.on('create', () => {
    console.log('activity created')
  })
  activity.on('pause', () => {
    console.log('activity paused')
  })
  activity.on('resume', () => {
    console.log('activity resumed')
  })
  activity.on('request', (nlp, action) => {
    console.log(nlp, action);
  })
  activity.on('destroy', () => {
    console.log('activity destroyed');
  })
}
```

The above function receives an argument `activity`, which includes the following methods:

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
- `setConfirm(intent, slot, options, attrs)` set if the confirm state.
- `exit()` exits the current application.
- `exitAll()` exits the current application and clean up others.

The following are convenient methods:

- `playSound(name)` play the local sound effect by the given name.

For the complete API reference, see [yodaRT.activity.Activity](yodaRT.activity.Activity.html).

### Permissions

The following is the permission table:

| Permission              | Description                   | Is default |
|-------------------------|-------------------------------|------------|
| `ACCESS_NETWORK_STATE`  | ability to use network.       | No         |
| `ACCESS_SERVICE`        | ability to use service.       | No         |
| `ACCESS_TTS`            | ability to use tts.           | Yes        |
| `ACCESS_MULTIMEDIA`     | ability to play remote music. | Yes        |
| `ACCESS_SOUND`          | ability to play local music.  | Yes        |
| `ACCESS_LIGHT`          | ability to use light.         | Yes        |
| `BLUETOOTH`             | ability to use bluetooth.     | Yes        |
| `GET_SYSTEM_VOLUME`     | ability to get volume.        | Yes        |
| `SET_SYSTEM_VOLUME`     | ability to set system volume. | Yes        |
