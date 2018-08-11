# YodaOS Framework

YodaOS Framework is the JavaScript layer in YodaOS. It provides the main functionalities includes:

- Getting and handling NLP request
- Playing music and TTS
- Controling the volume
- Controling the network state
- Providing basic SDK for application development

## Getting Started

The Jenkins Project: [kamino-universal-node](http://ci-s.rokid-inc.com/job/kamino_universal_node_gx8010_openai_corp)

## How to develop an app

目前有2种类型的 App，一种是 light App，另一种是 extapp。这2种类型的 App 开发流程是完全相同的，api 也是完全相同的，你甚至不用更改一行代码。

这2种 App 的区别就是是否独立运行在一个进程中。light App 是运行在 OS 进程中的，而 extapp 是独立运行在自己的进程中的。

你需要在 package 中声明 metadata 字段。extapp 的 metadata 定义如下：

```json
metadata: {
  extapp: true,
  daemon: false,
  dbusConn: {
    objectPath: "/extapp/network",
    ifaceName: "com.extapp.network"
  },
  skills: [
    "your appId"
  ]
}
```
daemon 字段如果为true，表示你的 App 需要自己保持运行状态。如果为 false 或 undefined，则不需要手动启动，OS 会在命中你的 App 时通过 fork 启动。

light app 的定义就很简单，只需要一个 appId 就行了。

```json
metadata: {
  skills: [
    "your appId"
  ]
}
```

接下来是如何编写 App。你只需要导出一个函数作为 hook，App 实例会通过参数传递，App 实例继承自 EventEmmitter。

```js
modele.exports = function (app) {
  app.on('created', callback);
  app.on('paused', callback);
  app.on('resumed', callback);
  app.on('onrequest', callback(nlp, action));
  app.on('destroyed', callback);
}
```
light App 和 extapp 都是同样的写法。App 实例中注入了很多模块，例如 tts、multimedia模块。


## Test

To run the unit tests on device, just try:

```shell
$ npm test
```

## Tools

How to configure to a device:

```shell
$ scripts/execute add_network <SSID> <PSK>
```

## License

Apache v2.0
