# YodaOS

YodaRT is the JavaScript layer in YodaOS. It provides the main functionalities includes:

- Getting and handling NLP request
- Playing music and TTS
- Controling the volume
- Controling the network state
- Providing basic SDK for application development

And it is powered by [ShadowNode](https://github.com/Rokid/ShadowNode), which provides the basic system API,
you could visit [API Documentation](https://github.com/Rokid/ShadowNode/tree/master/docs/api) for details.

<!-- {project.manifest.apilevel} -->

## Getting Started

The Jenkins Project: [kamino-universal-node](http://ci-s.rokid-inc.com/job/kamino_universal_node_gx8010_openai_corp)

## Test

To run the unit tests on device, just try:

```shell
$ npm test
```

The above command would install all source code and tests on your connected device, if you just wanna
put tests only, try the following:

```shell
$ tools/runtime-install -t; tools/test
```

We supported the following TAP reporters:

- [tap-nyan](https://github.com/calvinmetcalf/tap-nyan)
- [tap-spec](https://github.com/scottcorgan/tap-spec)
- [tap-json](https://github.com/gummesson/tap-json)

Use the cli params to select which reporter do you prefer use:

```shell
$ npm test -- -r tap-nyan
```

For more options, see

```shell
$ tools/test --help
$ tools/runtime-install --help
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
