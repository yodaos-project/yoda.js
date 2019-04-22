# YODAOS Test Suite

This directory contains all the tests and data to test the [YODAOS][] runtime.

## Test Directories

| Directory | Purpose |
|-----------|---------|
| @yoda     | Tests for the yoda-packages under the scope `@yoda` |
| runtime   | Tests for the yoda-runtime which contains components and libs |
| apps      | Tests for the built-in applications |
| fixture   | The data tests |
| helper    | The helper library to help test easy |

## Runs on CI

[YODAOS][] uses the `testsets.txt` to specify which files would be ran in every CI job. This file is written
in glob syntax, for example:

```txt
@yoda/env/*.test.js
apps/cloudAppClient/*.test.js
```

The above represents we have 3 glob exprs, and:

- In first line, it runs all the files with the postifix `.test.js` under the directory `./test/@yoda/env`.
- 2nd, it runs the files with the postifix `.test.js` under the directory `./test/apps/cloudappclient`.

For the detail for glob, see [node-glob#glob-primer](https://github.com/isaacs/node-glob#glob-primer).

## Write tests for runtime

### What's a test

All tests in runtime are JavaScript programs it tests functionalities provided by runtime and check that it 
behaves as expected. Tests should exit with code `0` on success. A test will fail if:

- It exits by setting process.exitCode to a non-zero number.
  - This is usually done by having an assertion throw an uncaught Error.
  - Occasionally, using `process.exit(code)` may be appropriate.
- It never exits. In this case, the test runner will terminate the test because it sets a maximum time limit.

Add tests when:

- adding new functionality.
- fixing regressions and bugs.
- expanding test coverage.

### Test structure

Let's analyze this basic test from the YODAOS test suite:

```javascript
'use strict'
var test = require('tape')
var AudioManager = require('@yoda/audio').AudioManager

test('should expect the constants of AudioManager', function (t) {
  t.equal(typeof AudioManager.STREAM_AUDIO, 'number')
  t.equal(typeof AudioManager.STREAM_TTS, 'number')
  t.end()
})
```

The above is the simple test for the module `@yoda/audio`, see [shadow-node/tape](https://github.com/shadow-node/tape) for details.

[YODAOS]: https://github.com/yodaos-project/yodaos-project/yodaos
