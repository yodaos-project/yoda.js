# Bluetooth service

  This is the app for run bluetooth service which will handle most bluetooth events in background.

## App URL

* scheme and host:

  * `yoda-app://bluetooth`

* paths and queries:

  * `/open`: Open bluetooth.

  * `/open_and_connect`: Open bluetooth and auto connect to history device.

  * `/open_and_play`: Open bluetooth and auto connect to history device and then start play music.

  * `/connect`: Connect to remote device.

  * `/disconnect`: Disconnect from currently connected remote device. Bluetooth radio will keep transmit, so other bluetooth device can find it by `/discovery`.

  * `/close`: Close bluetooth. Any connection will be break and radio will no longer transimitting.

  * `/discovery`: Start discovery.

|scheme and host|path|query's key|query's value|remark|
|---|---|---|---|---|
||/open|mode|A2DP_SINK|Open bluetooth at SINK mode. It will auto connect to history device if has.|
||||A2DP_SOURCE|Open bluetooth at SOURCE mode. It will auto connect to history device if has.
||/open_and_connect|mode|A2DP_SINK|Open bluetooth at SINK mode and auto connect to history device. The diff from `/open` is has a failed TTS if cannot connect to history device.|
||||A2DP_SOURCE|Open bluetooth at SOURCE mode and auto connect to history device. The diff from `/open` is has a failed TTS if cannot connect to history device.|
|yoda-app://bluetooth|/open_and_play|||Open bluetooth at SINK mode and auto connect to history device and then start play music.|
||/connect|address|remote device MAC|Try connect to specified remote device.|
|||name|remote device name||
||/disconnect|||Disconnect from remote device. Bluetooth radio will keep transmit, so other bluetooth device can find it by `/discovery`.|
||/close|||Close bluetooth. Any connection will be break and radio will no longer transimitting.|
||/discovery|||Start discovery around other bluetooth device.|


