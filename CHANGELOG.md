# Node.js Modules ChangeLog

> Node.js 模块更新日志

### 8-22-2017

- znode: 该模块为 Rokid Linux 提供一个优化过的 Node.js 运行环境如下：
  - 使用 libnode.so 实现了微型解释器
- node-ams: 语音应用框架，每个应用都必须实例化一个`@rokid/ams`
- node-bluetooth: 蓝牙设备 Node.js 实现，目前拥有打开／关闭蓝牙广播的功能
- node-dbus: DBus 的 Node.js 实现
- node-lumen: 灯光接口的 Node.js 实现
- node-rplay: 音频播放的 Node.js 实现，目前仅支持音频播放
- node-tts: TextToSpeech 的 Node.js 实现
- node-volume: 提供了控制系统音量的 Node.js 实现

### 8-24-2017

- node-tts:
  - 增加单元测试
  - 增加`tapdriver`探针
- node-rplay:
  - 增加单元测试
  - 重命名模块，`rplay`改为`player`
  - 增加`.play(url)`
- node-ams
  - 增加`tapdriver`探针

### 9-15-2017

- node-ams
  - `action.fetch()`增加了`from`参数用于传入`request`事件中
- node-dbus
  - 替换了原来的 JavaScript 实现的模块，使用底层`dbus`模块，并提供 JavaScript 绑定
- node-bluetooth
  - 增加了`ble()`提供低功耗蓝牙的功能
- node-wifi
  - 新增该模块用于提供网络配置功能