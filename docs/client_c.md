# Develop native app

On YodaOS, you can build any apps using clang. This document will describe how to use c sdk to develop your apps.

### Dependencies

- `json-c` : json decode and encode lib.
- `flora` : IPC lib.
- `rlog` `rklog` : record the log to system.
- `caps` : used for flora to store the serializing data.

### How to build c api document

Go to the folder: 
`client/c/`
Exec the following command:
`doxygen Doxyfile`
The api documents will be built in the directory "doc".

### The output 

After building the sdk, the following files will generated in the ipkg-install folder:

```shell
usr/
├── bin
├── include
│   ├── yodaos_api_defines.h //the base type defines
│   ├── yodaos_apis.h //the api name and event name
│   └── yodaos_sdk.h //the whole sdk methods to call for developer
└── lib
    └── libyodaosclient_c.so //your app must link the dynamic library
```

The files named yodaos_apis.h and yodaos_api_container.h are automatically generated, so do not modify it directly.
If you want to modify the two files content, refer to the script `tools/generate-api-c.js`.
### The method and event naming rule
for example(method):
`YODAOSAPI_NS_AUDIOFOCUS_MT_REQUEST`
- `YODAOSAPI` : The prefix.
- `NS` : Namespace.
- `AUDIOFOCUS` : The content of namespace.
- `MT` : Method.
- `REQUEST` : The content of method.
  
for example(event):
`YODAOSAPI_NS_AUDIOFOCUS_EV_GAIN`
- `YODAOSAPI` : The prefix.
- `NS` : Namespace.
- `AUDIOFOCUS` : The content of namespace.
- `EV` : Event.
- `GAIN` : The content of event.

### Example

Refer to client/c/example/example.c
