> This project is fork from: https://github.com/hiproxy/step-flow

# step-flow

简单的流程控制库，可以轻松的完成按步骤执行的流程控制 - 按顺序一个一个执行函数。支持异步的步骤流程和流程跳转。

[![license](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/zdying/step-flow/blob/master/LICENSE)

## 特色

* 简洁轻量
* 代码覆盖率100%
* 支持步骤名称
* 支持步骤自由跳转
* 支持异步步骤流程
* 支持错误统一处理
* 支持上下文

## 使用

### 1. 引入step-flow

```js
var Flow = require('step-flow');
```

### 2. 创建一个流程

```js
var flow = new Flow();
```

### 3. 添加步骤和函数

一个步骤，对应多个函数：

```js
flow.use(
  'step1',
  function fn1 (ctx, next) {
    ctx.fn1 = true;
    next();
  },
  function fn11 (ctx, next) {
    ctx.fn11 = true;
    next();
  }
);
```

一个步骤对应一个函数：

```js
flow
  .use('step2', function fn2 (ctx, next) {
    ctx.fn2 = true;
    // next();
  })
  .use(function fn3 (ctx, next) {
    ctx.fn3 = true;
  });
```

### 4. 错误处理

```js
flow.catch(function (err) {
  console.log('flow error:', err);
});
```

### 5. 运行步骤函数

```js
var context = {};

flow.run(context)
```

## API

<a name="StepFlow"></a>

### StepFlow()
步骤流程控制

* [StepFlow()](#StepFlow)
    * [.use([stepName])](#StepFlow+use) ⇒ [<code>StepFlow</code>](#StepFlow)
    * [.catch(fn)](#StepFlow+catch) ⇒ [<code>StepFlow</code>](#StepFlow)
    * [.run(context, stepName, thisArg)](#StepFlow+run) ⇒ [<code>StepFlow</code>](#StepFlow)

<a name="StepFlow+use"></a>

<br/>

#### stepFlow.use([stepName]) ⇒ [<code>StepFlow</code>](#StepFlow)
添加步骤以及对应的函数。
如果指定的步骤已经存在，这些函数将会追加到这个步骤中。
如果不存在，则新建一个新的步骤。

这里添加的每一个函数在执行时都会接收到参数`(context, next, nextTo, data)`：

* `context`：上下文对象。
* `next(err[,data])`：执行步骤中的下一个函数，如果不调用，不会执行下一个函数。
* `nextTo(step[,data])`：调用这个方法并传递步骤名称，可以跳转到对应的步骤。
* `data`：调用`next(null, data)`中传入的数据。

只有调用`next()`，才会继续执行步骤中的下一个函数。如果调用时，传入了非空的参数`err`，则后面的函数不再执行，使用`catch(fn)`设置的错误处理函数会被执行。
如果调用`next()`/`nextTo()`时，传递了参数`data`，**下一个**函数会接收到这个数据。
但是，下一个之后的的函数不会接收到这个数据，除非在下一个函数中再次调用`next()/nextTo()`时传递`data`。

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [stepName] | <code>String</code> | <code>&#x27;default&#x27;</code> | 需要新建或者追加函数的步骤名称，如果省略这个参数，默认使用`default` |

<a name="StepFlow+catch"></a>

<br/>

#### stepFlow.catch(fn) ⇒ [<code>StepFlow</code>](#StepFlow)
添加错误处理函数，当调用`next(err)`，并传递非空的`err`参数时，会调用这些错误处理函数。

此外，如果`use()`方法指定的方法运行时报错，`fn`也会被执行，错误对象也会被传递给`fn`。

参数`fn`会接受到参数`(err)`, `err`为错误信息。

| Param | Type | Description |
| --- | --- | --- |
| fn | <code>function</code> | 错误处理函数 |

<a name="StepFlow+run"></a>

<br/>

#### stepFlow.run(context, stepName, thisArg) ⇒ [<code>StepFlow</code>](#StepFlow)
开始执行步骤函数。
如果指定了步骤名称，将从对应的步骤开始执行。如果没有指定，则从第一个步骤开始执行。

| Param | Type | Description |
| --- | --- | --- |
| context | <code>Any</code> | 上下文对象，每个步骤的函数都会接受到这个参数 |
| stepName | <code>String</code> |起始步骤名称，默认从第一个步骤开始 |
| thisArg | <code>Object</code> | 步骤函数的this |

## Authors

* __zdying__ - _HTML/JavaScript/CSS/Node.js developer_ [zdying](https://github.com/zdying)

查看其他贡献者 [contributors](https://github.com/zdying/step-flow/graphs/contributors)。

## License

这个项目采用MIT协议 - 详细信息请查看[LICENSE](https://github.com/zdying/step-flow/blob/master/LICENSE)。
