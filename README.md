# rokidos-node

基于 JavaScript/Node.js 体系的语音交互系统。

### 模块

rokidos-node 提供以下基础模块：

**多媒体**

- [x] [`tts`](modules/tts) 文本转语音接口；
- [x] [`player`](module/player) 多媒体播放接口；

**IPC**

- [x] [`dbus`](modules/dbus) 进程间通讯使用 DBus 完成；

**硬件接口**

- [x] [`wifi`](modules/wifi) 用于连接、断开以及获取局域网；
- [x] [`lumen`](modules/lumen) 用于控制设备上的灯光效果；
- [x] [`volume`](modules/volume) 用于控制设备上的音量，包括多个通道的控制；
- [x] [`bluetooth`](modules/bluetooth) 用于控制设备端蓝牙的状态；

### 运行平台

目前，项目可运行在如下开发板：

- [x] AmLogic A113
- [x] AmLogic 905D

### License

Apache v2.0
