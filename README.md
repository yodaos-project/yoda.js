# rokidos-node

一个基于 Node.js 生态的语音交互运行时。

### 模块

- 基础库
  - [x] [`dbus`](module/dbus) 进程间通讯模块；
  - [x] [`property`](module/property) 系统属性库；
- 硬件
  - [x] [`wifi`](module/wifi) WIFI模块；
  - [x] [`lumen`](module/lumen) LED灯光控制模块；
  - [x] [`volume`](module/volume) 音量控制库；
  - [x] [`bluetooth`](modules/bluetooth) 蓝牙模块；
- 媒体控制
  - [x] [`player`](medule/player) 媒体播放模块；
  - [x] [`tts`](module/tts) 语音合成库；
- 框架
  - [x] [`vui`](module/vui) 语音交互应用框架；
  - [ ] `gui` 图形交互框架

### 兼容性

目前，该库支持在如下平台运行

- [x] RokidOS/Linux
- [ ] RokidOS/Android
- [ ] 浏览器

### License

Apache v2.0
