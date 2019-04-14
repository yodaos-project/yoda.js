# step-flow

step-flow is a lightweight(without any libraries and less than 200 lines) business processes control library that allows to easily manage business logic by step. step-flow using the syntax of middleware which is similar to express. It provides process control, step jumps, and unified error handling.

[中文版文档](https://github.com/zdying/step-flow/blob/master/README-zh.md)

[![Build Status](https://travis-ci.org/zdying/step-flow.svg?branch=master)](https://travis-ci.org/zdying/step-flow)
[![Build status](https://ci.appveyor.com/api/projects/status/okl9e4xs1nsuv7yq/branch/master?svg=true)](https://ci.appveyor.com/project/zdying/step-flow/branch/master)
[![codecov](https://codecov.io/gh/zdying/step-flow/branch/master/graph/badge.svg)](https://codecov.io/gh/zdying/step-flow)
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat)](https://github.com/Flet/semistandard)
[![Node.js version](https://img.shields.io/badge/node-%3E%3D0.12.7-green.svg)](https://nodejs.org/)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/zdying/step-flow/blob/master/LICENSE)

## Features

* Simple and lightweight
* Code coverage 100%
* Support step name
* Support step jump
* Support asynchronous step flow
* Supports error handling
* Support context

## Install

```bash
npm install --save step-flow
```

## Usage

### 1. require step-flow

```js
var Flow = require('step-flow');
```

### 2. create a flow

```js
var flow = new Flow();
```

### 3. add step function

one step with multiple functions:

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

one step with one function:

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

### 4. error handling

```js
flow.catch(function (err) {
  console.log('flow error:', err);
});
```

### 5. run

```js
var context = {};

flow.run(context)
```

## API

<a name="StepFlow"></a>

### StepFlow()

* [StepFlow()](#StepFlow)
    * [.use([stepName])](#StepFlow+use) ⇒ [<code>StepFlow</code>](#StepFlow)
    * [.catch(fn)](#StepFlow+catch) ⇒ [<code>StepFlow</code>](#StepFlow)
    * [.run(context, stepName, thisArg)](#StepFlow+run) ⇒ [<code>StepFlow</code>](#StepFlow)

<a name="StepFlow+use"></a>

<br/>

#### stepFlow.use([stepName]) ⇒ [<code>StepFlow</code>](#StepFlow)

Add the steps and the corresponding function. If the specified steps already exist, these functions will be appended to this step. If it does not exist, create a new one.

Each function added here will receive the parameters `(context, next, nextTo, data)`:

* `context`: context object.
* `next(err[,data])`: Execute the next function in step, and if it is not called, the next function will not be executed.
* `nextTo(step[,data])`: Call this method and pass the step name, you can jump to the corresponding steps.
* `data`: the data that the `next(null, data)` pass.

Only call `next()` will continue to execute the next function in the step. If a non-empty parameter err is passed, and the subsequent functions will not be executed. The error handling function set with `catch(fn)` will be executed. If you call `next()`/`nextTo()`, and passing the parameter `data`, the next function will receive this data. However, the functions that after the 'next function' will not receive this data, unless the 'next function' call `next()`/`nextTo()` and pass the data.

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [stepName] | <code>String</code> | <code>&#x27;default&#x27;</code> | The step name, if you omit this parameter, the default use is `default` |

<a name="StepFlow+catch"></a>

<br/>

#### stepFlow.catch(fn) ⇒ [<code>StepFlow</code>](#StepFlow)

Add error handling functions that will be executed when `next (err)` is called and a non-null `err` arguments are passed.

In addition, if an error occurs while running the method specified by the `use()` method, `fn` will also be executed and the error object will be passed to `fn`.

The `fn` will accept the parameter`(err)`,`err` for the error message.

| Param | Type | Description |
| --- | --- | --- |
| fn | <code>function</code> | Error handling function |

<a name="StepFlow+run"></a>

<br/>

#### stepFlow.run(context, stepName, thisArg) ⇒ [<code>StepFlow</code>](#StepFlow)

Start to run the step functions.
If the step name is specified, it will be executed from the corresponding step. If it is not specified, it will be executed from the first step.

| Param | Type | Description |
| --- | --- | --- |
| context | <code>Any</code> | Context object, the function of each step will accept this parameter|
| stepName | <code>String</code> |Start step name, starting from the first step by default |
| thisArg | <code>Object</code> | The `this` value of the step functions |

## Running tests

```bash
npm test
```

## Contributing

Please read [CONTRIBUTING.md](https://github.com/zdying/step-flow/blob/master/CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Authors

* __zdying__ - _HTML/JavaScript/CSS/Node.js developer_ [zdying](https://github.com/zdying)

See also the list of [contributors](https://github.com/zdying/step-flow/graphs/contributors) who participated in this project.

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/zdying/step-flow/blob/master/LICENSE) file for details
