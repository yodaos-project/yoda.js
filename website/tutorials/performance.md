This tutorial shows how to maximize the app's performance which includes:

- Startup optimization
- Respond quickly to user
- Stable on memory
- Stable on performance

### Startup optimization

To be done.

### Respond quickly to user

To be done.

### Stable on memory

An app with stable memory is a vital property, which makes your app could be consistent at anytime with your
user.

**Capture the heapdump for specified JavaScript process**

> Dependencies: you need to replace your libiotjs.so with HEAP_PROFILER-enabled. See [Optimization-Tips.md#heap-profiler][]
> for detailed steps.

```bash
$ setprop persist.sys.vm.heapdump yes # execute and restart the process
$ kill -12 <pid> # send the SIGUSR2 to specified process by pid
```

The above command would generate the heapdump profiles on the device `/data`.

```bash
/data/heapdump-<pid>.json
```

Next step, you can transfer the JSON to Chorme-readable `.heapsnapshot` file by
[ShadowNode's tool][]:

```bash
$ node ./jsv8snap.js heapdump-1000.json example.heapsnapshot
```

And load the `example.heapsnapshot` at Chrome's memory view.

> Note: the `.heapsnapshot` extension name is required.

### Stable on performance

To be done.

[Optimization-Tips.md#heap-profiler]: https://github.com/Rokid/ShadowNode/blob/master/docs/devs/Optimization-Tips.md#heap-profiler
[ShadowNode's tool]: https://github.com/Rokid/ShadowNode/blob/master/deps/jerry/tools/profiler/j2v8snap.js
