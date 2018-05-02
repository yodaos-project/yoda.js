# logger

日志系统，支持如下：

- [x] 实时查看：可以通过连接到固定的端口实时获取

### 如何使用

```js
var logger = require('@rokid/logger')('foobar');

logger.log('a log here...');
logger.info('info message...');
logger.warn('warn message...');
logger.error('error message...');
```

### 实时查看

目前默认日志服务端口为：`19788`，使用 `line-stream` 协议输出内容，可以在任意局域网内
连接服务进行日志查看。
