# YodaRT

[![Build Status](https://ci.rokid.com/buildStatus/icon?job=rokid-ci-yodart-unit-tests)](https://ci.rokid.com/job/rokid-ci-yodart-unit-tests)
[![codecov](https://codecov.io/gh/yodaos-project/yodart/branch/master/graph/badge.svg)](https://codecov.io/gh/yodaos-project/yodart)
[![License](https://img.shields.io/badge/licence-apache%202.0-green.svg)](LICENSE.md)
[![Backers on Open Collective](https://opencollective.com/yodart/backers/badge.svg)](#backers) 
[![Sponsors on Open Collective](https://opencollective.com/yodart/sponsors/badge.svg)](#sponsors)

YODAOS runtime is the JavaScript layer in [YODAOS][]. It provides the main functionalities includes:

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

For more useful development tools, see [tools](./tools#yodaos-core-tools).

## Contributors

This project exists thanks to all the people who contribute. 
<a href="https://github.com/yodaos-project/yodart/graphs/contributors"><img src="https://opencollective.com/yodart/contributors.svg?width=890&button=false" /></a>


## Backers

Thank you to all our backers! 🙏 [[Become a backer](https://opencollective.com/yodart#backer)]

<a href="https://opencollective.com/yodart#backers" target="_blank"><img src="https://opencollective.com/yodart/backers.svg?width=890"></a>


## Sponsors

Support this project by becoming a sponsor. Your logo will show up here with a link to your website. [[Become a sponsor](https://opencollective.com/yodart#sponsor)]

<a href="https://opencollective.com/yodart/sponsor/0/website" target="_blank"><img src="https://opencollective.com/yodart/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/yodart/sponsor/1/website" target="_blank"><img src="https://opencollective.com/yodart/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/yodart/sponsor/2/website" target="_blank"><img src="https://opencollective.com/yodart/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/yodart/sponsor/3/website" target="_blank"><img src="https://opencollective.com/yodart/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/yodart/sponsor/4/website" target="_blank"><img src="https://opencollective.com/yodart/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/yodart/sponsor/5/website" target="_blank"><img src="https://opencollective.com/yodart/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/yodart/sponsor/6/website" target="_blank"><img src="https://opencollective.com/yodart/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/yodart/sponsor/7/website" target="_blank"><img src="https://opencollective.com/yodart/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/yodart/sponsor/8/website" target="_blank"><img src="https://opencollective.com/yodart/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/yodart/sponsor/9/website" target="_blank"><img src="https://opencollective.com/yodart/sponsor/9/avatar.svg"></a>



## License

[Apache-2.0](LICENSE.md)

[YODAOS]: https://github.com/yodaos-project/yodaos

