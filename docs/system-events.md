# System Events

This document defines system events in YodaOS that can be used to:

- Customize any module
- Monitor system status
- Provide system integration test interface

### Table of Contents

* [Modules Overview](#modules-overview)
* [Events](#events)
  * [`rokid.turen.voice_coming`](#instantrokidturenvoice_coming)
  * [`rokid.turen.local_awake`](#instantrokidturenlocal_awake)
  * [`rokid.turen.start_voice`](#instantrokidturenstart_voice)
  * [`rokid.turen.voice`](#instantrokidturenvoice)
  * [`rokid.turen.sleep`](#instantrokidturensleep)
  * [`rokid.turen.pickup`](#instantrokidturenpickup)
  * [`rokid.turen.mute`](#instantrokidturenmute)
  * [`rokid.turen.addVtWord`](#instantrokidturenaddvtword)
  * [`rokid.turen.removeVtWord`](#instantrokidturenremovevtword)
  * [`rokid.speech.prepare_options`](#persistrokidspeechprepare_options)
  * [`rokid.speech.options`](#persistrokidspeechoptions)
  * [`rokid.speech.stack`](#persistrokidspeechstack)
  * [`rokid.speech.final_asr`](#instantrokidspeechfinal_asr)
  * [`rokid.speech.inter_asr`](#instantrokidspeechinter_asr)
  * [`rokid.speech.extra`](#instantrokidspeechextra)
  * [`rokid.speech.nlp`](#instantrokidspeechnlp)
  * [`rokid.speech.error`](#instantrokidspeecherror)
  * [`rokid.speech.completed`](#instantrokidspeechcompleted)
* [Methods](#methods)
  * [speech-service](#speech-service)
    * [`asr2nlp(text, options)`](#asr2nlptext-options)
  * [vui](#vui)
    * [`rokid.skilloptions()`](#rokidskilloptions)

### Modules Overview

In the process of voice interaction, YodaOS is mainly divided into three system modules: turenproc, speech service and vui service.

The turenproc is used to capture PCM data from microphone, determine whether the voice activates the device, and report the activated voice data. The speech service receives the voice data of turenproc, uploads it to the cloud, and returns the NLP result to vui. 

The vui service manages the lifetime of the applications and dispatches NLP to different applications through the configration.

### Events

The following is a list of events for YodaOS. There are usually two uses, one is to use some events to get the corresponding data and state, and the other is to replace some system modules and reimplement them according to the document.

#### `(instant)rokid.turen.voice_coming`

This indicates a local activation event, which is typically provided by the local activation module.

#### `(instant)rokid.turen.local_awake`

This indicates a local angle event, which typically has a 50ms delay compared to `voice_coming` and provides an angle of the current speech input relative to the microphone coordinates.

- `angle` {float} source location angle

#### `(instant)rokid.turen.start_voice`

Voice activated, voice data will output continuous.

- `trigger` {string} voice trigger, utf-8 format wake word.
- `trigger_start` {int32} voice trigger data start position.
- `trigger_end` {int32} voice trigger data length in bytes
- `energy` {float} the energy value of the current voice.
- `cloud_verfiy` {int32} support cloud-based wake word verification.
- `id` {int32} the voice request id.

#### `(instant)rokid.turen.voice`

The voice data in PCM.

- `data` {raw} the pcm data.
- `id` {int32} the voice request id.

#### `(instant)rokid.turen.sleep`

The activation module deactived by user voice 'exit trigger'.

#### `(instant)rokid.turen.pickup`

This is used to control the activation module to enable/disable the data recording.

- `enabled` {int32} enable or disable the pickup, 1 for enabling, otherwise is disabling.

#### `(instant)rokid.turen.mute`

This is used to control the activation module to mute and unmute.

- `muted` {int32} 0 for unmute, 1 for mute.

#### `(instant)rokid.turen.addVtWord`

This is used to add the trigger wake word to activation module.

- `text` {string} the trigger word in ZH-CN.
- `pinyin` {string} the trigger word in pinyin.
- `type` {int32} the trigger word type, 1 is for wake word, 2 is for local sleep, 3 is hot command.

#### `(instant)rokid.turen.removeVtWord`

Removes the custom trigger word.

- `text` {string} the trigger word in ZH-CN.

#### `(instant)rokid.speech.completed`

This module should be implemented by the speech-service, it tells the activation module this request is done.

- `id` {int32} the voice request id.

#### `(persist)rokid.speech.prepare_options`

The credential information for connecting the speech service, we use [Rokid OpenPlatform](https://developer.rokid.com) by default.

- `uri` {string} the uri of speech service.
- `key` {string} the key.
- `device_type_id` {string} the device type id.
- `secret` {string} the secret.
- `device_id` {string} the device id.
- `reconnect_interval` {double} the interval for reconnect to service when less connectvity.
- `ping_interval` {double} the keep alive to ping.
- `timeout` {double} no response timeout to the speech service.

#### `(persist)rokid.speech.options`

The options for speech service.

- `lang` {double} chinese(0), english(1).
- `codec` {double} pcm(0), opus(1).
- `vad_mode` {double} local(0), cloud(1).
- `vad_timeout` {double} the vad end timeout when `vad_mode` is cloud(1).
- `require_nlp` {double} if returns the nlp.
- `require_full_asr` {double} if returns the intermediate asr result.
- `ignore_voice` {double} the milliseconds ignore part of voice data.
- `voice_mtu` {double} separate voice data to fragment with max size.

#### `(persist)rokid.speech.stack`

Uploads the NLP domains in the format `cut-domain:scene-domain`.

- `stack` {string} the domain stack.

#### `(instant)rokid.speech.final_asr`

The final speech recognization result.

- `text` {string} the final result.
- `id` {int32} the voice request id.

#### `(instant)rokid.speech.inter_asr`

The intermediate speech recognization result.

- `text` {string} the intermediate result.
- `id` {int32} the voice request id.

#### `(instant)rokid.speech.extra`

Voice data to asr, extra result (activation cloud confirm, multiple devices activation arbitrate, etc).

- `extra` {string} the extra information.
- `id` {int32} the voice request id.

#### `(instant)rokid.speech.nlp`

Voice data recognization, NLP / Action result.

- `nlp` {string} the nlp data.
- `action` {string} the action data.
- `id` {int32} the voice request id.

#### `(instant)rokid.speech.error`

Voice data recognization, error.

- `code` {int32} error code
- `id` {int32} the voice request id.

#### `(instant)rokid.speech.completed`

Voice data recognization completed (normal or abnormal, turen should stop pickup).

- `id` {int32} the voice request id.

### Methods

If you try to implement a specific module in YodaOS, such as speech-service, then you need to reimplement all the methods under the module firstly.

#### speech-service

This service is generally used to upload voice data and distribute the results of cloud recognition as system events.

##### `asr2nlp(text, options)`

Converts the pure text to NLP, it returns the result like `rokid.speech.nlp`.

- `text` {string} the input text.
- `options` {string} the skill options.

#### vui

The vui service is used to handle the logic related to voice interaction, including voice application management and NLP delivery.

##### `rokid.skilloptions()`

Gets the skill options, it returns a JSON string, no parameters is required.
