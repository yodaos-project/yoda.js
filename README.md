# rokidos-node

一个基于 Node.js 生态的语音交互运行时。

### 模块

- 基础库
  - [x] [`dbus`](modules/dbus) 进程间通讯模块；
  - [x] [`property`](modules/property) 系统属性库；
- 硬件
  - [x] [`wifi`](modules/wifi) WIFI模块；
  - [x] [`lumen`](modules/lumen) LED灯光控制模块；
  - [x] [`volume`](modules/volume) 音量控制库；
  - [x] [`bluetooth`](modules/bluetooth) 蓝牙模块；
- 媒体控制
  - [x] [`player`](medules/player) 媒体播放模块；
  - [x] [`tts`](modules/tts) 语音合成库；
- 框架
  - [x] [`vui`](modules/vui) 语音交互应用框架；
  - [ ] `gui` 图形交互框架

### 兼容性

目前，该库支持在如下平台运行

- [x] RokidOS/Linux
- [ ] RokidOS/Android
- [ ] 浏览器

### License

Apache v2.0
