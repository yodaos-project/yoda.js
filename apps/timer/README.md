# Timer

A simple app support start/pause/continue/cancel/restart a timer.

## URL: `yoda-app://timer`

## event `url path`

* `/timer_start`: Start a new timer.

  queries:

  * `day`

  * `hour`

  * `minute`

  * `second`

  * `tts`(optional)

* `/timer_pause`: Pause current timer.

  queries:

  * `tts`(optional)

* `/timer_keepon`: Continue paused timer.

  queries:

  * `tts`(optional)

* `/timer_close`: Cancel current timer.

  queries:

  * `tts`(optional)

* `/timer_restart`: Restart current timer.

  queries:

  * `tts`(optional)

* `/howtouse_timer`: Usage of timer.

* `/timer_comeback`: Query remain time of current timer.
