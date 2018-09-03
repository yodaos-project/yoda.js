# 灯光服务

## 入门教程

请前往 confluence: [灯光入门教程](https://confluence.rokid-inc.com/pages/viewpage.action?pageId=1836758)

## 调试工具

### bin/play.js

命令行调用灯光服务，模拟App里面的 light.play 接口

用法：iotjs bin/play.js name [key=value]...

例子：iotjs bin/play.js awake arg1=value1 arg2=value2

上面的执行效果为：会调用 light 服务去执行 /opt/light/awake.js 灯效，并且参数会转换为

```
{
  arg1: value1,
  arg2: value2
}
```
传递给灯效文件，灯效文件中通过 data 就可以拿到这个参数

注意，现在会把参数全部当做字符串，即 degree=60 会转换为

```
{
  degree: '60'
}
```

后面会想办法解决这个问题