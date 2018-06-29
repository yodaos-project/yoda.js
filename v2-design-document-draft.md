## RokidOS v2 Design Document Draft

The RokidOS v2's design principle is embrace the Web community mainly. We redesign most packages by embracing the Web API like:

- `Event`, `KeyboardEvent`, `UIEvent`
- `Bluetooth`
- `SpeechSynthesis`
- `SpeechRecognition`
- `MediaSource`, `MediaStream`
- `NetworkInformation`
- `Storage`
  - `window.localStorage`
  - `window.sessionStorage`
- `WebSocket`

We chooses Web API than Node.js, which doesn't mean drop up the Node.js ecosystem, all modules are still a Node.js package, but we encapsulate them in the `activation` process in Web API, which means anyone are able to access modules by the global object `window` just like in browser what you do.

### Supported Apps

First of all, the system supports the following types to create an app:

- [x] LightApp
- [x] ExtApp(via D-Bus)

And the built-ins apps list is:

- (*LightApp*)
  - [ ] First Guidance
  - [ ] System
  - [ ] Volume Controls
- (*ExtApp*)
  - [ ] Network
  - [ ] CloudApp Client
  - [ ] Alarm & Reminder
  - [ ] Bluetooth & Bluetooth Music

### Configuration

- [ ] `namePrefix` the device name rule is `${namePrefix}-${sn.slice(-6)}`.
- [ ] `triggerWords` customize your trigger words.
  - [ ] `pinyin` the pinyin of your words.
  - [ ] `text` the text of your words.
- [ ] `tts` customize your tts features.
  - [ ] `declaimer` the tts tone, like `rokid`, `xmly` and etc.
  - [ ] `speecd` the default speaking speed.
- [ ] `network`
  - [ ] `autoConnectInterval` the interval to reconnect the networking auto.
- [ ] `bluetooth`
  - [ ] `ttl` time to live for BLE module.
- [ ] `sounds`
  - [ ] `BOOT_SETUP` When system is up.
  - [ ] `BOOT_RESET_SETTINGS` When system is reset settings.
  - [ ] `NETWORK_SETUP` When network is setup.
  - [ ] `WIFI_PREPARED_INFO` When WI-FI is prepared and information ready.
  - [ ] `WIFI_CONNECT_FAILED` When WI-FI connection failed.
  - [ ] `BLUETOOTH_BLE_CONNECTED` When BLE is connected.
  - [ ] `BLUETOOTH_OPEN` When bluetooth opens.
  - [ ] `LOCAL_AWAKE` When local awake.

**Customize key event handler**

A script at `/data/system/event-handler.js` should be proceed like the following:

```js
window.onkeyup = function(event) {
  if (event.code === 99) {
    SpeechSynthesisUtterance.volume = 99; // this sets the volume of TTS channel.
  }
};
```

### Activation Runtime

The `activation` is the main process, alternatively a D-BUS service `com.rokid.activation`. And provides the following objects:

| Module Name | Object Path          | Description                 |
|-------------|----------------------|-----------------------------|
| NLP         | `/activation/nlp`    | Receive/Send a NLP commands.|
| Property    | `/activation/prop`   | Get the system properties.  |
| Network     | `/activation/network`| Provide APIs to modify network state. |
| ExtApp      | `/activation/extapp` | Register/Start/Destroy/Say/Play. |

#### Rokid SDK

- [ ] Login with serial No. & seed
- [ ] Device bind & unbind
- [ ] MQTT register & connection

#### NLP Dispatcher

- [ ] Voice event: To view voice event, please click the [Rokid/node-turen](https://github.com/Rokid/node-turen/blob/master/lib/events.json) for details.
- [x] Skill Stack: See below.
- [x] App Lifecycle: See below.
- [ ] App Permission: See below.
- [ ] Crontab: See below.
- [ ] Service: See below.

**Skill Stack**

This stack maintains the NLP state in device-end. Every skill handles multiple NLP commands, and has 2 different forms: `cut`, `scene` and `service`.

The stack stores the whole skill mappings, by the following rules:

- always keep 0 or 1 `cut` skill, stack removes the old `cut` before the new is pushed.
- always keep 0 or 1 `scene` skill, stack removes the old `scene` before the new is pushed.

> configuration might support (>=1) `scene`.

**App Lifecycle**

The `activation` defines 5 stages:

| Lifecycle     | Description      | Active |
|---------------|------------------|--------|
| `created()`   | App is created   | Yes    |
| `resumed()`   | App is resumed   | Yes    |
| `paused()`    | App is paused    | No     |
| `destroyed()` | App is destroyed | No     |
| `onrequest()` | NLP requests     | Yes    |

Below is the diagram for the **App Lifecycle**, it guides you to learn how an app works in the whole system.

<img width="613" alt="screen shot 2018-06-25 at 6 20 02 pm" src="https://user-images.githubusercontent.com/1935767/41845036-aa5aa058-78a4-11e8-93d0-9b4645cb60a3.png">

**App Permission**

The below table defines the available permissions:

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

> The above list are not complete, and very straightforward.

**Crontab**

NLP Dispatcher exposes the API for Crontab service to provide reliable and persistent timer functions.

- [ ] `enqueue(expr, data)` enqueue a task.
  - `expr` {String} the crontab expr for when to trigger.
  - `data` {Object} the context data.
- [ ] `cancel(handle)` cancel a task.
- [ ] `list()` list all tasks.

**Service**

The `service` context API has the following methods:

- `alive()` pushes the `service` on the peak of stack.
- `sleep()` pops the `service` and push to the bottom of stack.

Services are used for running sensor handler in background. It requires the permission `ACCESS_SERVICE`.

#### Remote Channel

- [ ] `version` Get the current OS name.
- [ ] `set_volume` Set the system volume.
- [ ] `get_volume` Get the system volume.
- [ ] `asr` Send {asr} command.
- [ ] `custom_config` Custom config.
- [ ] `forward` Forward command.
- [ ] `cloud_forward` Forward CloudApp command.
- [ ] `reset_settings` Reset the OS settings.
- [ ] `sys_update_available` Check for the new version.
- [ ] `event` Other events.

### Services in Device

Every MSD(Micro Service in Device) should export the D-BUS API. The below is the base rules, the MSD should follow:

- implementing a method `ping` to return the current status of MSD.
- methods except for `ping` should require an argument `appId`, and verify its value with NLP dispatcher's permission APIs. That says only the verified application can use MSD.

And the following are current services to be implemented:

- [ ] `ttsd` is for converting plain text to human audio.
- [ ] `lightd` is for executing light effects.
- [ ] `multimediad` is for playing media player.
- [ ] `keyinputd` is for handling key input events.

### Modules

- [ ] Framework
  - [ ] `extapp` provides an elegant framework to develop ExtApp.
- [ ] System
  - [ ] `volume` controls system volumes like mute, unmute, volume up, volume down and multiple channels supported.
  - [ ] `bluetooth` supports the BLE messaging and Bluetooth backtrack controls.
  - [ ] `wifi` supports list available WIFI, connect and disconnect.
  - [ ] `input` supports an input key EventHub.
  - [ ] `battery` gets the battery status.
- [x] Speech
  - [x] [`turen`](https://github.com/Rokid/node-turen) provides the elegant API for getting voice & NLP events.
- [ ] User Interface
  - [ ] `light` is a engine to run our `.led` files.
  - [ ] `tts` supports convert plain text or SSML to OPUS-encoded audio.
  - [ ] `multimedia` is the player for local and remote audio/video.
  - [ ] `sound` is for playing local `.wav` sound effect files like keypress "ding".
- [ ] Storage
  - [ ] `property` is the Android prop SDK on our linux OS.
- [ ] Utils
  - [ ] `logger` is our logging which supports group and clean.
  - [ ] `tracing` is an API to send track events.

supported by ShadowNode:

- [x] D-Bus
- [x] MQTT/MQTTs
- [x] WebSocket

### Event Tracing

The following events are needed to be sent to Rokid Tracing Cloud:

| Event Name                | Description                           |
|---------------------------|---------------------------------------|
| `system.awake.event`      | When activation is awaken.            |
| `system.voice.reject`     | When a voice is rejected.             |
| `system.nlp.result`       | Receives an NLP command.              |
| `system.media.start`      | When multimedia starts.               |
| `system.media.pause`      | When multimedia is paused.            |
| `system.media.stop`       | When multimedia is stoped.            |
| `system.media.change`     | When multimedia changes.              |
| `system.volumeup.click`   | When key is clicked for volume up.    |
| `system.volumedown.click` | When key is clicked for volume down.  |
| `system.mutekey.click`    | When key is clicked for mute/unmute.  |
| `system.volume.change`    | When volume changes.                  |
| `system.volume.supress`   | When volume supress.                  |
| `system.volume.resume`    | When volume resumes from mute state.  |
| `system.battery`          | Battery events.                       |
| `system.wifi`             | Wifi & Network events.                |
| `system.shutdown`         | When system is down.                  |
| `system.appstack.changed` | when skill stack changes.             |
| `system.alarm`            | When alarm is active.                 |
| `system.tracker.error`    | Report errors                         |
