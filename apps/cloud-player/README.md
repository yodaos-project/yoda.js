# Cloud Player

A generic player which autonomously manages audio focuses and media resources.

## Yoda URLs

### yoda-app://cloud-player/play

Queries:
- `text`: String. Optional speech synthesis text.
- `url`: String. Optional media url.
- `transient`: Enum `0`, `1`. Optional flag indicates if the media was expected to be requested with transient focus. Defaults to `1`
- `sequential`: Enum `0`, `1`.  Optional flag indicates if the speech synthesis and media should be played in sequential order but not simultaneously. Defaults to `0`.
- `tag`: Optional media tag. Cloud Player does nothing with it.

### yoda-app://cloud-player/pause

### yoda-app://cloud-player/resume


### yoda-app://cloud-player/seek

Queries:
- `to`: Number. Optional position to be sought to.
- `by`: Number. Optional delta to be sought by.

If both `to` and `by` are specified in query, `by` would be ignored.

### yoda-app://cloud-player/set-speed

Queries:
- `speed`: Number.

### yoda-app://cloud-player/stop

### yoda-app://cloud-player/play-tts-stream

Queries:
- `pickupOnEnd`: Enum `0`, `1`. Open microphone on end of stream. Defaults to `1`.
- `pickupDuration`: Number, Pickup duration in milliseconds.

## Flora Events

### yodaos.apps.cloud-player.multimedia.playback-status

Message: [`status-code`, `media-tag`]

### yodaos.apps.cloud-player.tts.status

Message: [`status-code`]

## Flora Methods

All methods were declared with target name `cloud-player`

### yodaos.apps.cloud-player.get-stream-channel

Only available when `yoda-app://cloud-player/play-tts-stream` is opened and would be unavailable right after end of stream.

Response: [`utter-id`]

### yodaos.apps.cloud-player.inspect-players

Retrieve currently available (either active or suspended temporarily) players status.

Response: [...[`tag`, ...[`key`, `value`]]]

Possible Key-Values:
- `duration`: Number. Media duration in milliseconds.
- `position`: Number. Media position in milliseconds.
- `playing`: Enum `0`, `1`. Media playing state.

## Types

### Player StatusCode

Enum of following numbers:
- `0`: Player started
- `1`: Player end
- `2`: Player cancelled
- `3`: Player error
