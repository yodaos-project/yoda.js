[![Build Status](https://travis-ci.org/Rokid/node-extapp.svg?branch=master)](https://travis-ci.org/Rokid/node-extapp)

# 这是什么？

这是为 vui 编写的 extapp 框架，让开发者更方便开发 extapp ，不需要处理重复的或者底层的通信协议。

# 框架的技术架构

```text

------------------------------------------------
|                     vui                      |
------------------------------------------------
        |                            |
        V                            V
     Adapter                      Adapter
        |                            |
        V                            V
---------------------     ----------------------
|      service1     |     |        service2    |   .......
---------------------     ----------------------
   |          |               |           |
   V          V               V           V
--------   --------       --------   --------
| app1 |   | app2 |       | app3 |   | app4 |      .......
--------   --------       --------   --------

```

从上图中可以看到，可以有多个 service，每个 service 可以有多个 extapp 。
每个 service 就是一个独立的进程，service 管理 extapp 。

vui 将 App 的事件通过 adapter 发送给 service ，service 通过 AppID 将事件转发给 App 。

adapter 是处理通信协议的适配器，service 不关心底层是如何通信的。目前使用 Dbus Adapter。

# 如何创建service

```js
var DbusAdapter = require('./adapter/dbus');
var ExtAppService = require('./index');

var service = new ExtAppService(DbusAdapter, {
  dbusService: 'com.rokid.AmsExport',
  dbusObjectPath: '/extapp/test',
  dbusInterface: 'com.test.interface'
});
```

只需要 new 一个 service 实例就行了。service 构造函数有两个参数：

一是 Adapter: adapter构造函数

二是 options：

 - dbusService: vui 的 dbus service name
 - dbusObjectPath: service 的 dbus object path
 - dbusInterface: service 的 dbus interface name

options 根据不同的 adapter 会有所不同，在内部，会将 options 传递给 adapter 作为参数。

dbusObjectPath 和 dbusInterface 是由你自己指定的，vui 会将事件发给指定的dbus接口。

service 有2个事件，继承 EventEmitter，分别是：

 - ready: service 初始化成功
 - error: service 内部发生错误，比如初始化 service 失败

service 有下面的方法，分别是：

 - create: (appId) => extapp

# 如何创建一个extapp

```js
var app = service.create('your appId', preload = false);
```

创建 App 非常简单，只需要调用 service 的 create 方法，指定 AppID。

preload 参数表示预加载，当你的 extapp 的 package->metadata.daemon 字段为 false 或 undefined 时，OS会预注册你的 appId，所以不需要再注册。

app 有7个事件，继承 EventEmitter，分别是：

 - ready: app 注册成功
 - error: app 内部发生错误，比如注册 App 失败
 - created: app 的生命周期 created 事件
 - paused: app 的生命周期 paused 事件
 - resumed: app 的生命周期 resumed 事件
 - onrequest: app 的生命周期 onrequest 事件
 - destroyed: app 的生命周期 destroyed 事件

app 有下面的方法或模块，分别是：

 - getAppId: () => appId
 - get: (key) => Promise
 - setPickup: (isPickup) => Promise
 - exit: () => Promise
 - tts: Module
 - audio: Module

tts 模块有下面方法：

 - say: (text) => Promise

audio 模块有下面方法：

 - play: (url) => Promise

# 如何自定义 Adapter

adapter 的工作是负责 service 和 vui 的数据通信，数据可以通过 dbus、socket 等传输。adapter 应该是一个构造函数，在创建实例时会传递 options。

adapter 需要实现以下接口：

 - listenAppEvent: (cb) => Promise
 - listenVuiEvent: (cb) => Promise
 - extAppMethod: (name, args) => Promise
 - propMethod: (name, args) => Promise
 - register: (appId) => Promise

### listenAppEvent: (cb) => Promise

cb: (name, args)

listenAppEvent 需要监听 vui 发送的 app 事件，收到事件时需要调用 cb 回调函数，包括 app 生命周期和 TTS、media 事件，并返回 Promise，监听成功后调用 resolve。

包含下列事件：

 - onCreate: [appId]
 - onPause: [appId]
 - onResume: [appId]
 - nlp: [appId, nlp, action]
 - onDestroy: [appId]
 - keyEvent: [appId]
 - onTtsComplete: [handle]
 - onMediaComplete: [handle]

### listenVuiEvent: (cb) => Promise

cb: (name, args)

listenVuiEvent 需要监听 vui 发送的事件通知，收到事件时需要调用 cb 回调函数，包括 vui 重启事件，并返回 Promise，监听成功后调用 resolve。

包含下列事件：

 - ready: []

### extAppMethod: (name, args) => Promise

extAppMethod 调用 vui 提供的 extapp 相关的远程方法，name 是方法名，args 是参数，调用成功后返回 Promise。args 参数是数组，返回的值也应该是数组。

### propMethod: (name, args) => Promise

propMethod 调用 vui 提供的 prop 相关的远程方法，name 是方法名，args 是参数，调用成功后返回 Promise。
args 参数是数组，返回的值也应该是数组。

### register: (appId) => Promise

register 方法接收 appId 参数，并调用 vui 的 extapp 注册方法，返回 Promise。



更多方法持续完善中。