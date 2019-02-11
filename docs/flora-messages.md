# flora messages and remote methods of YodaRT

Table of Contents
=================

   * [messages](#messages)
      * [rokid.turen.voice_coming](#rokidturenvoice_coming)
      * [rokid.turen.local_awake](#rokidturenlocal_awake)
      * [rokid.turen.start_voice](#rokidturenstart_voice)
      * [rokid.turen.voice](#rokidturenvoice)
      * [rokid.turen.sleep](#rokidturensleep)
      * [rokid.turen.pickup](#rokidturenpickup)
      * [rokid.turen.mute](#rokidturenmute)
      * [rokid.speech.completed](#rokidspeechcompleted)
      * [rokid.turen.addVtWord](#rokidturenaddvtword)
      * [rokid.turen.removeVtWord](#rokidturenremovevtword)
      * [rokid.speech.prepare_options](#rokidspeechprepare_options)
      * [rokid.speech.options](#rokidspeechoptions)
      * [rokid.speech.stack](#rokidspeechstack)
      * [rokid.speech.final_asr](#rokidspeechfinal_asr)
      * [rokid.speech.inter_asr](#rokidspeechinter_asr)
      * [rokid.speech.extra](#rokidspeechextra)
      * [rokid.speech.nlp](#rokidspeechnlp)
      * [rokid.speech.error](#rokidspeecherror)
      * [rokid.speech.completed](#rokidspeechcompleted-1)
   * [remote methods](#remote-methods)
      * [(speech-service) asr2nlp](#speech-service-asr2nlp)
      * [(vui) rokid.skilloptions](#vui-rokidskilloptions)

## messages

### rokid.turen.voice_coming

first event of far-field voice active

#### msgtype: instant

#### No Parameter

---

### rokid.turen.local_awake

second event of far-field voice active

#### msgtype: instant

#### Parameters:

type | description
--- | ---
float | source location angle

---

### rokid.turen.start_voice

voice actived, voice data will output continuous

#### msgtype: instant

#### Parameters:

type | description
--- | ---
string | voice trigger, utf-8 format chinese word
int32 | voice trigger data start position
int32 | voice trigger data length in bytes
float | voice power
int32 | cloud confirm flag.<br>0: cloud service not check voice data and voice trigger word.<br>1: cloud service check consistency of voice data and voice trigger word.
int32 | id

---

### rokid.turen.voice

voice data

#### msgtype: instant

#### Parameters:

type | description
--- | ---
binary | voice data
int32 | id

---

### rokid.turen.sleep

ai front-end(turen) deactive by user voice 'exit trigger' (meishile)

#### msgtype: instant

#### No Parameter

---

### rokid.turen.pickup

control ai front-end(turen) open/close voice data record

#### msgtype: instant

#### Parameters:

type | description
--- | ---
int32 | open/close pickup<br>0: close pickup<br>1: open pickup

---

### rokid.turen.mute

control ai front-end(turen) mute/unmute

#### msgtype: instant

#### Parameters:

type | description
--- | ---
int32 | mute/unmute<br>0: unmute<br>1: mute

---

### rokid.speech.completed

notify ai front-end(turen) speech request completed

#### msgtype: instant

#### Parameters:

type | description
--- | ---
int32 | id of speech request(created by turen)

---

### rokid.turen.addVtWord

tell ai front-end(turen) for add voice trigger word

#### msgtype: instant

#### Parameters:

type | description
--- | ---
string | word of hanzi (utf8 encode)
string | pinyin
int32 | type of word<br>1: awake word<br>2: sleep word<br>3: hot word

---

### rokid.turen.removeVtWord

tell ai front-end(turen) for remove voice trigger word

#### msgtype: instant

#### Parameters:

type | description
--- | ---
string | word of hanzi (utf8 encode)

---

### rokid.speech.prepare_options

authorization info for openvoice sdk

#### msgtype: persist

#### Parameters:

type | description
--- | ---
string | uri of openvoice cloud service
string | key for authorization
string | device type id for authorization
string | secret for authorization
string | device id for authorization
int32/double | reconnect interval if disconnected to cloud service
int32/double | ping interval to cloud service
int32/double | no response timeout of cloud service

---

### rokid.speech.options

options for openvoice speech sdk

#### msgtype: persist

#### Parameters:

type | description
--- | ---
int32/double | lang of speech sdk<br>0: zh<br>1: en
int32/double | codec of speech sdk<br>0: pcm<br>1: opus
int32/double | vad mode<br>0: local vad<br>1: cloud vad
int32/double | cloud vad end timeout in milliseconds, if vad mode == 1.
int32/double | tell speech cloud service should/not return nlp to sdk
int32/double | tell speech cloud service should/not return intermediate asr to sdk
int32/double | tell speech cloud service ignore part of voice data, in milliseconds.
int32/double | separate voice data to fragment with max size

---

### rokid.speech.stack

update cdomain:sdomain

#### msgtype: persist

#### Parameters:

type | description
--- | ---
string | stack string (cdomain:sdomain)

---

### rokid.speech.final_asr

voice data to asr, final result.

#### msgtype: instant

#### Parameters:

type | description
--- | ---
string | asr string
int32 | speech request id (created by turen)

---

### rokid.speech.inter_asr

voice data to asr, intermediate result.

#### msgtype: instant

#### Parameters:

type | description
--- | ---
string | asr string
int32 | speech request id (created by turen)

---

### rokid.speech.extra

voice data to asr, extra result (activation cloud confirm, multiple devices activation arbitrate, etc.)

#### msgtype: instant

#### Parameters:

type | description
--- | ---
string | extra
int32 | speech request id (created by turen)

---

### rokid.speech.nlp

voice data recognization, nlp/action result.

#### msgtype: instant

#### Parameters:

type | description
--- | ---
string | nlp
string | action
int32 | speech request id (created by turen)

---

### rokid.speech.error

voice data recognization, error.

#### msgtype: instant

#### Parameters:

type | description
--- | ---
int32 | error code
int32 | speech request id (created by turen)

---

### rokid.speech.completed

voice data recognization completed(normal or abnormal, turen should stop pickup)

#### msgtype: instant

#### Parameters:

type | description
--- | ---
int32 | speech request id (created by turen)

---

## remote methods

### (speech-service) asr2nlp

asr convert to nlp/action result

#### Parameters:

type | description
--- | ---
string | asr
string | skill options

#### Return:

return code: 0 if success, otherwise error code.

data:

if return code == 0

type | description
--- | ---
string | nlp
string | action

if return code != 0

type | description
--- | ---
int32 | speech cloud error code

---

### (vui) rokid.skilloptions

#### No Parameter

#### Return:

return code: 0 if success.

type | description
--- | ---
string | skill options string
