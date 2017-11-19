# rokidos-node

A Node.js-based runtime for RokidOS, the Voice & Graphics UI integration OS.

### What's this project?

In `rokidos-node`, we, the Rokid company build the complete AI framework includes:

- [x] Voice User Interface
- [ ] Graphics User Interface

All are by Node.js and some are bindings.

### modules

- Common
  - [x] [`dbus`](modules/dbus) The IPC messaging library.
  - [x] [`property`](modules/property) The property library.
- Hardware Interface
  - [x] [`WIFI`](modules/wifi) The library to configure WIFI's status.
  - [x] [`lumen`](modules/lumen) The light library to control your LED user interface.
  - [x] [`volume`](modules/volume) The volume library.
  - [x] [`bluetooth`](modules/bluetooth) The BlueTooth module support common and BLE functions.
- Mutimedia
  - [x] [`tts`](modules/tts) The TextToSpeech library based our openvoice cloud.
  - [x] [`player`](modules/player) The media player to control audio and video's play.
  - [ ] [`sounder`](modules/sounder) This module is to play simple and short sound effects.
- Framework
  - [x] [`vui`] The Voice User Interface framework which also is based on our openvoice cloud.
  - [ ] [`gui`] The Graphics User Implementation for working with the whole system.

### Compatiblities

Basically, we are hoping the RokidOS for Node.js is able to run on:

- [x] Linux
- [ ] Android
- [ ] Web Browser

Anyone is very welcomed to run this runtime at anywhere that you want, feel free to open issue
to share your thoughts, that's respects.

### License

Apache v2.0
