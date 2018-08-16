'use strict';

/**
 * @namespace yodaRT.activity
 */

var property = require('property');
var logger = require('logger')('activity');

function createActivity(appId, parent) {
  var activity = new EventEmitter();
  /**
   * @memberof yodaRT.activity
   * @class Activity
   * @augments EventEmitter
   * @example
   * module.exports = function(activity) {
   *   activity.on('ready', () => {
   *     console.log('activity is ready');
   *   });
   *   activity.on('request', (nlp) => {
   *     // handle nlp
   *   });
   * }
   */
  return Object.assign(activity, {
    /**
     * Exits the current application.
     * @function exit
     * @memberof yodaRT.activity.Activity
     * @instance
     */
    exit: function exit() {
      return parent.runtime.exitAppById(appId);
    },
    /**
     * Exits the current application and clean up others.
     * @function destroyAll
     * @memberof yodaRT.activity.Activity
     * @instance
     */
    destroyAll: function destroyAll() {
      return parent.runtime.destroyAll();
    },
    /**
     * Get the current `appId`.
     * @function getAppId
     * @memberof yodaRT.activity.Activity
     * @instance
     */
    getAppId: function getAppId() {
      return appId;
    },
    /**
     * Set the current app is pickup
     * @function setPickup
     * @param {Boolean} pickup
     * @memberof yodaRT.activity.Activity
     * @instance
     */
    setPickup: function setPickup(pickup) {
      return parent.runtime.setPickup(pickup);
    },
    /**
     * @function mockNLPResponse
     * @memberof yodaRT.activity.Activity
     * @instance
     * @private
     */
    mockNLPResponse: function(nlp, action) {
      parent._onVoiceCommand(nlp, action);
    },
    /**
     * The `TtsClient` is used to control TextToSpeech APIs.
     * @memberof yodaRT.activity.Activity
     * @instance
     * @type {yodaRT.activity.Activity.TtsClient}
     */
    tts: {
      /**
       * @memberof yodaRT.activity.Activity
       * @class TtsClient
       */

      /**
       * Speak the given text.
       * @memberof yodaRT.activity.Activity.TtsClient
       * @instance
       * @function speak
       * @param {String} text
       * @param {Function} callback
       */
      speak: function(text, callback) {
        parent.adapter.ttsMethod('speak', [appId, text])
          .then((args) => {
            logger.log(`tts register ${args[0]}`);
            parent.ttsCallback[`ttscb:${args[0]}`] = callback;
          })
          .catch((err) => {
            logger.error(err);
          });
      },
      /**
       * Stop the current task.
       * @memberof yodaRT.activity.Activity.TtsClient
       * @instance
       * @function stop
       * @param {Function} callback
       */
      stop: function(callback) {
        parent.adapter.ttsMethod('stop', [appId])
          .then((args) => {
            callback(null);
          })
          .catch((err) => {
            callback(err);
          });
      },
    },
    /**
     * The `MediaClient` is used to control multimedia APIs.
     * @memberof yodaRT.activity.Activity
     * @instance
     * @type {yodaRT.activity.Activity.MediaClient}
     */
    media: {
      /**
       * @memberof yodaRT.activity.Activity
       * @class MediaClient
       */

      /**
       * Start playing your url.
       * @memberof yodaRT.activity.Activity.MediaClient
       * @instance
       * @function start
       * @param {String} uri
       * @param {Function} callback
       */
      start: function (url, callback) {
        parent.adapter.multiMediaMethod('start', [appId, url])
          .then((args) => {
            logger.log('media register', args);
            parent.multiMediaCallback['mediacb:' + args[0]] = callback.bind(activity);
          })
          .catch((err) => {
            logger.error(err);
          });
      },
      /**
       * Pause the playing.
       * @memberof yodaRT.activity.Activity.MediaClient
       * @instance
       * @function pause
       * @param {Function} callback
       */
      pause: function (cb) {
        parent.adapter.multiMediaMethod('pause', [appId])
          .then((args) => {
            cb.call(activity, null);
          })
          .catch((err) => {
            cb.call(activity, null);
          });
      },
      /**
       * Resume the playing.
       * @memberof yodaRT.activity.Activity.MediaClient
       * @instance
       * @function resume
       * @param {Function} callback
       */
      resume: function (cb) {
        parent.adapter.multiMediaMethod('resume', [appId])
          .then((args) => {
            cb.call(activity, null);
          })
          .catch((err) => {
            cb.call(activity, null);
          });
      },
      /**
       * Stop the playing.
       * @memberof yodaRT.activity.Activity.MediaClient
       * @instance
       * @function stop
       * @param {Function} callback
       */
      stop: function (cb) {
        parent.adapter.multiMediaMethod('stop', [appId])
          .then((args) => {
            cb.call(activity, null);
          })
          .catch((err) => {
            cb.call(activity, null);
          });
      }
    },
    /**
     * @memberof yodaRT.activity.Activity
     * @instance
     * @type {yodaRT.activity.Activity.LightClient}
     */
    light: {
      /**
       * @memberof yodaRT.activity.Activity
       * @class LightClient
       */

      /**
       * @memberof yodaRT.activity.Activity.LightClient
       * @instance
       * @function play
       * @param {Function} callback
       */
      play: function (name, args) {
        return parent.adapter
          .lightMethod('play', [appId, name, JSON.stringify(args || [])]);
      },
      /**
       * @memberof yodaRT.activity.Activity.LightClient
       * @instance
       * @function stop
       * @param {Function} callback
       */
      stop: function () {
        return parent.adapter
          .lightMethod('stop', [appId]);
      },
    },
    /**
     * @memberof yodaRT.activity.Activity
     * @instance
     * @type {yodaRT.LocalStorage}
     */
    localStorage: {
      /**
       * @memberof yodaRT
       * @class LocalStorage
       */

      /**
       * @memberof yodaRT.LocalStorage
       * @instance
       * @function getItem
       */
      getItem: function (key) {
        return property.get(key);
      },
      /**
       * @memberof yodaRT.LocalStorage
       * @instance
       * @function setItem
       */
      setItem: function (key, value) {
        return property.set(key, value);
      },
    },
    /**
     * @memberof yodaRT.activity.Activity
     * @instance
     * @function playSound
     */
    playSound: function (name) {
      var len = name.length;
      var absPath;
      // etc.. system://path/to/sound.ogg
      if (len > 9 && name.substr(0, 9) === 'system://') {
        absPath = MEDIA_SOURCE + name.substr(9);
      // etc.. self://path/to/sound.ogg
      } else if (len > 7 && name.substr(0, 7) === 'self://') {
        absPath = parent.appHome + '/' + name.substr(7);
      // etc.. path/to/sound.ogg
      } else {
        absPath = parent.appHome + '/' + name;
      }
      return parent.adapter.lightMethod('appSound', [appId, absPath]);
    },
  });
}

exports.createActivity = createActivity;
