# The VUI framework

The VUI framework for Rokid skills and applications.

## Features

This framework supports the following:

- lightapp: the light app in JavaScript which is embeded in framework itself.
- nativeapp: the aloneside application.

### Light App

The light app is embeded in the VUI framework itself, and scripted by JavaScript. 
The following applications that you should use it:

- `cut` application that wants access to the native abilities.
- `scene` application within a very short-term lifecycle.

For developers, you can prototype your VUI products by scripting with Light App, that
would be speedy for this purpose. But be carefully, don't put any application with heavy
tasks to Light App.

### Native App

VUI framework also provides an efficient and safe way for some complicated usages like
games, AR and other apps with rendering or training.

In this kind of application, we currently provides framework with C/C++ and Node.js 
interface. Internally every Native App process is a DBus service within its `SkillId`,
and VUI framework process could distribute data by this bus.

Note: never mind, developer don't care about DBus details, and it might be replaced by other
IPC methods like shared memory, Binder and etc., so don't directly use the DBus interface.

## License

GPLv2.0
