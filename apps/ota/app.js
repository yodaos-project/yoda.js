'use strict'

var Application = require('@yodaos/application').Application
var AudioFocus = require('@yodaos/application').AudioFocus
var SpeechSynthesis = require('@yodaos/speech-synthesis').SpeechSynthesis

var ota = require('@yoda/ota')
var system = require('@yoda/system')
var MediaPlayer = require('@yoda/multimedia').MediaPlayer
var logger = require('logger')('otap')
var util = require('util')

var strings = require('./strings.json')

var getAvailableInfoAsync = util.promisify(ota.getAvailableInfo)

/**
 *
 * @param {YodaRT.Activity} activity
 */
module.exports = function (api) {
  var speechSynthesis = new SpeechSynthesis(api)

  function speakAsync (text) {
    var focus = new AudioFocus(AudioFocus.Type.TRANSIENT, api.audioFocus)
    focus.onGain = () =>
      speechSynthesis.speak(text)
        .on('cancel', () => focus.abandon())
        .on('error', () => focus.abandon())
        .on('end', () => focus.abandon())
    focus.onLoss = () =>
      speechSynthesis.cancel()
    focus.request()
  }

  function playExAsync (url) {
    return new Promise((resolve, reject) => {
      var focus = new AudioFocus(AudioFocus.Type.TRANSIENT_EXCLUSIVE, api.audioFocus)
      var player = new MediaPlayer()
      player.prepare(url)
      player.on('error', reject)
      player.on('cancel', resolve)
      player.on('playbackcomplete', resolve)
      focus.onGain = () =>
        player.resume()
      focus.onLoss = () =>
        player.stop()
      focus.request()
    })
  }

  function checkUpdateAvailability () {
    logger.info('fetching available ota info')
    getAvailableInfoAsync().then(info => {
      if (info == null) {
        return speakAsync(strings.NO_UPDATES_AVAILABLE)
      }
      if (info.status === 'downloading') {
        return ota.getImageDownloadProgress(info, (err, progress) => {
          if (err) {
            return speakAsync(strings.UPDATES_START_DOWNLOADING)
          }
          var utterance
          if (isNaN(progress) || progress < 0 || progress >= 100) {
            utterance = strings.UPDATES_START_DOWNLOADING
          } else {
            progress = Math.round(progress * 100)
            utterance = util.format(strings.UPDATES_ON_DOWNLOADING, progress)
          }
          return speakAsync(utterance)
        })
      }
      if (info.status !== 'downloaded') {
        ota.runInBackground()
        return speakAsync(strings.UPDATES_START_DOWNLOADING)
      }
      return ota.condition.getAvailabilityOfOta(info)
        .then(availability => {
          switch (availability) {
            case true:
              return startUpgrade(info.imagePath)
            case 'low_power':
              return speakAsync(strings.UPDATE_NOT_AVAILABLE_LOW_POWER)
            case 'extremely_low_power':
              return speakAsync(strings.UPDATE_NOT_AVAILABLE_EXTREMELY_LOW_POWER)
            default:
              return speakAsync(strings.NO_UPDATES_AVAILABLE)
          }
        })
    }, error => {
      logger.error('Unexpected error on check available updates', error.stack)
      return speakAsync(strings.NO_UPDATES_AVAILABLE)
    })
  }

  function whatsCurrentVersion () {
    speakAsync(strings.GENERIC_VERSION_ANNOUNCEMENT)
  }

  /**
   *
   * @param {URL} url
   */
  function onFirstBootAfterUpgrade (url) {
    speakAsync(url.query.changelog || strings.OTA_UPDATE_SUCCESS)
    ota.resetOta(function onReset (err) {
      if (err) {
        logger.error('Unexpected error on reset ota', err.stack)
      }
    })
  }

  function startUpgrade (imagePath, isForce) {
    logger.info(`using ota image ${imagePath}`)
    var ret = system.prepareOta(imagePath)
    if (ret !== 0) {
      logger.error(`OTA prepared with status code ${ret}, terminating.`)
      return speakAsync(strings.OTA_PREPARATION_FAILED)
    }
    var media = '/opt/media/ota_start_update.ogg'
    if (isForce) {
      media = '/opt/media/ota_force_update.ogg'
    }
    return playExAsync(media)
      .then(() => system.reboot('ota'), err => {
        logger.error('Unexpected error on announcing start update', err.stack)
        system.reboot('ota')
      })
  }

  var app = Application({
    url: function url (url) {
      switch (url.pathname) {
        case '/check_sys_upgrade':
          checkUpdateAvailability()
          break
        case '/check_sys_version':
          whatsCurrentVersion()
          break
        case '/on_first_boot_after_upgrade':
          onFirstBootAfterUpgrade(url)
          break
        case '/force_upgrade':
          startUpgrade(url.query.image_path, true)
          break
      }
    }
  }, api)

  return app
}
