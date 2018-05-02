# node-dbus2
node-dbus2 is the DBus binding for Node.js.

## Installation

```sh
$ npm install dbus2 --save
```

## Dependencies

- node-gyp
- libdbus

## Getting Started

Best way to get started is by looking at the examples. After the build:

1. Navigate to `path/to/dbus/examples` folder
1. Run `node service.js &`
1. Run  `node hello.js`

Work your way through other examples to explore supported functionality.

## Note on systems without X11
If no X server is running, the module fails when attempting to obtain a D-Bus
connection at `dbus.getBus()`. This can be remedied by setting two environment
variables manually (the actual bus address might be different):

```js
process.env.DISPLAY = ':0';
process.env.DBUS_SESSION_BUS_ADDRESS = 'unix:path=/run/dbus/system_bus_socket';
```

## API

### dbus

The root object of this module.

#### `dbus.getBus(busName)`

* busName `<string>`

Connect to a bus. `busName` must be either `"system"` to connect to the system
bus or `"session"` to connect to the session bus.

Returns a `Bus`.

```
var bus = dbus.getBus('session');
```

#### `dbus.registerService(busName, serviceName)`

* busName `<string>`
* serviceName `<string>`

Register a service on a specific bus. This allows the caller to create a DBus
service.

`busName` must be either `"system"` to create the service on the system bus, or
`"session"` to create the service on the session bus. _Note: the system bus
often has security requirements that need to be met before the service can be
registered._

Returns a `Service`.

```
const service = dbus.registerService('session', 'com.example.Library');
```

### Bus

An active connection to one of DBus' buses.

#### `Bus.prototype.getInterface(serviceName, objectPath, interfaceName, callback)`

* serviceName `<string>` - The well-known name of the service that owns the object.
* objectPath `<string>` - The path of the object.
* interfaceName `<string>` - Which of the object's interfaces to retrieve.
* callback `<function>`

Get an existing object's interface from a well-known service.

Once retrieved, `callback` will be called with either an error or with an
`Interface`.

```js
bus.getInterface('com.example.Library', '/com/example/Library/authors/DAdams', 'com.example.Library.Author1', (err, interface) => {
  if (err) {
      ...
  }
  // Do something with the interface
});
```

#### `Bus.prototype.disconnect()`

Disconnect from DBus. This disconnection makes it so that Node isn't kept
running based on this active connection. It also makes this bus, and all of its
children (interfaces that have been retrieved, etc.) unusable.

### Interface

#### `Interface.prototype.getProperty(propertyName, callback)`

* propertyName `<string>` - The name of the property to get.
* callback `<function>`

Get the value of a property.

Once retrieved `callback` will be called with either an error or with the value
of the property.

```js
interface.getProperty('Name', (err, name) => {
  // TODO
});
```

#### `Interface.prototype.setProperty(propertyName, value, callback)`

* propertyName `<string>` - The name of the property to get.
* value `<any>` - The value of the property to set.
* callback `<function>`

Set the value of a property.

Once set `callback` will be called with either an error or nothing.

```js
interface.setProperty('Name', 'Douglas Adams', (err) => {
  // TODO
});
```

#### `Interface.prototype.getProperties(callback)`

* callback `<function>`

Get the value of all of the properties of the interface.

Once retrieved `callback` will be called with either an error or with an object
where the keys are the names of the properties, and the values are the values
of those properties.

```js
interface.getProperties((err, properties) => {
  console.log(properties.Name);
});
```

#### `Interface.prototype[methodName](...args, [options], callback)`

* methodName `<string>` - The name of the method on the interface to call.
* ...args `<any>` - The arguments that must be passed to the method.
* options `<object>` - The options that can be set. This is optional.
  * options.timeout `<number>` - The number of milliseconds to wait before the
    request is timed out. This defaults to `-1`: don't time out.
* callback `<function>`

Call a method on the interface.

Once executed, `callback` will be called with either an error or with the
result of the method call.

```js
interface.AddBook("The Hitchhiker's Guide to the Galaxy", { timeout: 1000 }, (err, result) => {
  // TODO
})
```

### Service

A DBus service created by the application.

#### `Service.prototype.createObject(objectPath)`

* objectPath `<string>` - The path of the object. E.g., `/com/example/ObjectName`

Create an object that is exposed over DBus.

Returns a `ServiceObject`.

```js
const object = service.createObject('/com/example/Library/authors/DAdams');
```

#### `Service.prototype.removeObject(object)`

* object `<ServiceObject>` - the service object that has been created

Remove (or unexpose) an object that has been created.

```js
service.removeObject(object);
```

#### `Service.prototype.disconnect()`

Disconnect from DBus. This disconnection makes it so that Node isn't kept
running based on this active connection. It also disconnects all of the objects
created by this service. 

### ServiceObject

An object that is exposed over DBus.

#### `ServiceObject.prototype.createInterface(interfaceName)`

* interfaceName `<string>` - The name of the interface.

Create an interface on an object.

Returns a `ServiceInterface`.

```js
const interface = object.createInterface('com.example.Library.Author1');
```

### ServiceInterface

An interface for an object that is exposed over DBus.

#### `ServiceInterface.prototype.addMethod(method, opts, handler)`

* method `<string>` - The name of the method
* opts `<object>` - Options for the method
  * opts.in - The signature for parameters
  * opts.out - The signature for what the method returns
* handler `<function>` - The method handler

Add a method that can be called over DBus.

```js
interface.addMethod('AddBook', {
	in: [DBus.Define(String), DBus.Define(Number)],
	out: [DBus.Define(Number)]
}, (name, quality, callback) => {
	doSomeAsyncOperation(name, quality, (err, result) => {
		if (err) {
			return callback(err);
		}
		callback(result);
	});
});
```

#### `ServiceInterface.prototype.addProperty(name, opts)`

* name `<string>` - The name of the property
* opts `<object>`
  * opts.type - The type of the property
  * opts.getter - The function to retrieve the value
  * opts.setter - The function to set the value (optional)

Add a property that can be get, and/or optionally set, over DBus.

```js
interface.addProperty('BooksWritten', {
  type: DBus.Define(Number),
  getter: (callback) => {
    getNumberOfBooksForAuthor((err, bookCount) => {
      if (err) {
        return callback(err);
      }
      callback(bookCount);
    });
  }
});

const name = 'Douglas Adams';
interface.addProperty('Name', {
  type: Dbus.Define(String),
  getter: (callback) => {
    callback(name);
  }
  setter: (value, done) => {
    name = value;
    done();
  }
});
```

#### `ServiceInterface.prototype.addSignal(name, opts)`

* name `<string>` - The name of the signal
* opts `<object>`
  * types

Create a DBus signal.

```js
interface.addSignal('bookCreated', {
  types: [DBus.Define(Object)]
});
```

#### `ServiceInterface.prototype.emitSignal(name, ...values)`

* name `<string>` - The name of the signal
* values `<any>` - The values to emit

Emit a signal

```js
interface.emit('bookCreated', { 
  name: "The Hitchhiker's Guide to the Galaxy" 
});
```

#### `ServiceInterface.prototype.update()`

Save interface updates after making changes. After changes to the interface are
made (via `addMethod`, `addProperty`, and `addSignal`), `update` must be called
to ensure that other DBus clients can see the changes that were made.

### DBus.Error

A DBus-specific error

#### `new dbus.Error(name, message)`

* name `<string>` - A valid DBus Error name, according to the [specification][spec]
* message `<string>` - A human readable message

Create a new error. The name must be a valid error name.

```js
throw new dbus.Error('com.example.Library.Error.BookExistsError', 'The book already exists');
```

#### `dbusError.dbusName`

The DBus Error name of the error. When a DBus.Error is created, its message is
set to the human-readable error message. The `dbusName` property is set to the
name (according to the DBus Spec).

## License 

MIT Licensed
