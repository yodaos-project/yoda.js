# YodaRT..

YodaRT is the JavaScript layer in YodaOS. It provides the main functionalities includes:

- Getting and handling NLP request
- Playing music and TTS
- Controling the volume
- Controling the network state
- Providing basic SDK for application development

And it is powered by [ShadowNode](https://github.com/Rokid/ShadowNode), which provides the basic system API,
you could visit [API Documentation](https://github.com/Rokid/ShadowNode/tree/master/docs/api) for details.

<!-- {project.manifest.apilevel} -->

## Test

To run the unit tests on device, just try:

```shell
$ npm test
 123 -_-_-_-_-_-_-_-_-_,------,
 0   -_-_-_-_-_-_-_-_-_|   /\_/\
 0   -_-_-_-_-_-_-_-_-^|__( ^ .^)
     -_-_-_-_-_-_-_-_-  ""  ""
  Pass!
```

Ensure you have a connected YodaOS device via ADB v1.0.39.

**Define your test.json**

`test.json` is the configuration in JSON for your testing jobs. An example is here:

```json
{
  "cloudgw": {
    "deviceId": "your device id",
    "deviceTypeId": "your device type id",
    "key": "your rokid cloud key",
    "secret": "your rokid cloud secret"
  },
  "wifi": {
    "ssid": "your ssid of wifi",
    "psk": "your psk of wifi"
  }
}
```

And put this file under the ./test directory.

## Development

In development, code changes are in a very frequent fashion and it might be hard to maintain
synchronization between local codes and device codes. Try following commands to cope with the
situation with ease:

```shell
$ npm restart
```

## Tools

Generate the API references:

```shell
$ npm run website
$ open website/docs/index.html
```

How to configure to a device:

```shell
$ ./tools/configure-network -s <ssid> -p <psk> -m <masterId>
```

## License

Apache v2.0
