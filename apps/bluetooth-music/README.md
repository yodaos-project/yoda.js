# Bluetooth music player

This is the app for play bluetooth music.

## App URL

* scheme and host:

  * `yoda-app://bluetooth-music`

* paths and queries:

  * `/start`: Start/resume play.

  * `/pause`: Pause music.

  * `/stop`: Stop music.

  * `/next`: Play next song.

  * `/prev`: Play previous song.

  * `/ffward`: Fast forward playing.

  * `/rewind`: Rewind playing.

  * `/like`: Add current song to favorite.

  * `/info`: Query current song's information.

|scheme and host|path|query's key|query's value|remark|
|---|---|---|---|---|
||/start|||Start/resume play.|
||/pause|||Pause music.|
||/stop|||Stop music.|
||/next|||Play next song.|
|yoda-app://bluetooth-music|/prev|||Play previous song.|
||/ffward|||Fast forward playing.|
||/rewind|||Rewind playing.|
||/like|||Add current song to favorite.|
||/info|||Query current song's information.|

## YodaOS event

* status event

  * flora subscribe name: `yodaos.apps.bluetooth.multimedia.playback-status`

  * flora message format: ```Number: 0=PLAYING | 1=STOPPED | 4=PAUSED```

* music info event

  * flora subscribe name: `yodaos.apps.bluetooth.multimedia.music-info`

  * flora message format: ```Stringify JSON-Object { title: xxx, artist: yyy, album: zzz }```
