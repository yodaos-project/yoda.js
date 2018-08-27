
Resources are the the staic contents that you would use in your application, YodaOS defines the following:

- multimedia files
- light scripts
- (user interface strings)
- (voice interface templates)
- (layout definitions)

> () means not implemented yet.

And resources are owned by system and applications, we use a URI to present where these files are on, for
example, to access the system resources:

```js
activity.media.start('system://ring.ogg');
activity.light.play('system://wakeup.js');
```

Application is able to store itself resources:

```js
activity.media.start('self://my-music.mp3');
activity.light.play('self://my-cool-effect.js');
```

### Multimedia

The system media files are stored at `/opt/media/`, to view the list of those files:

```shell
$ ls /opt/media/
```

And the application multimedia directory is on `${APP_DIRECTORY}/media`, just use the `self://` protocol
to access:

```js
activity.media.start('self://foobar/startup.ogg');
```

This reads the media file `${APP_DIRECTORY}/media/foobar/startup.ogg`, and start playing. For the complete
API about `media`, see [yodaRT.activity.Activity.MediaClient](yodaRT.activity.Activity.MediaClient.html).

### Light Scripts

Every light effect could be writtern as a JavaScript file:

```js
module.exports = function (context, params, callback) {
  context.pixel(10, 255, 255, 255, .7)
  context.render()
  context.requestAnimationFrame(() => {
    context.fill(100, 100, 100, .7)
    context.render()
    callback()
  })
}
```

The `context` provides all the convient write functions:

- `pixel` is to write to a single light.
- `fill` is to write to all the lights.
- `requestAnimationFrame` is the same function at browser, but within an explict timeout after callback.

See [yodaRT.LightRenderingContext](yodaRT.LightRenderingContext.html) for the complete APIs on the `context`.

The `params` is passed through the `activity.light.play()`, it could be used to control what the effect should
be. And `callback` is the function which should be called, when the light is finished.

The system light scripts are stored at `/opt/light`, and the application's is at `${APP_DIRECTORY}/light`, for
example:

```js
activity.light.play('self://test/e1.js')
```

This would requires from `${APP_DIRECTORY}/light/test/e1.js`, and start the function in script.
