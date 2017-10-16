# node-android-property

The android's property library binding for Node.js.

### Installation

```sh
$ npm install android-property --save
```

### Usage

```js
const property = require('@rokid/property');
property.locale;  // zh-CN
property.version; // 0.2.0
property.get('ro.product.locale');
property.set('foobar', 'set');
```

### License 

Apache v2.0
