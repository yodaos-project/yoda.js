# YodaRT

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

## Tools

How to configure to a device:

```shell
$ scripts/execute add_network <SSID> <PSK>
```

## License

Apache v2.0
