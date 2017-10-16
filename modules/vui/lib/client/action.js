'use strict';

/**
 * @class ActionComposer
 */
class ActionComposer {
  /**
   * @method constructor
   * @param {String} event
   * @param {Object} nlp - the nlp object
   * @param {Object} action - the action object
   * @param {RokidApp} app
   */
  constructor(event, nlp, action, app) {
    this._event = event;
    this._nlp = nlp;
    this._action = action;
    this._app = app;
    this._fetched = false;
    this._response = null;
    if (this.isCloud) {
      this._response = this._action.response.action;
    } else {
      this._response = this._nlp;
    }
  }
  /**
   * @property {String} appid
   */
  get appid() {
    return this._nlp.appId;
  }
  /**
   * @property {Boolean} isCloud
   */
  get isCloud() {
    return this._nlp.cloud;
  }
  /**
   * @property {Object} response
   */
  get response() {
    return this._response;
  }
  /**
   * @property {String} type
   */
  get type() {
    return this.response.type;
  }
  /**
   * @property {Object} voice
   */
  get voice() {
    return this.response.voice;
  }
  /**
   * @property {Object} media
   */
  get media() {
    return this.response.media;
  }
  /**
   * @property {Array} directives
   */
  get directives() {
    return this.response.directives;
  }
  /**
   * @property {String} form
   */
  get form() {
    return this.response.form;
  }
  /**
   * @property {Object} action
   */
  set action(val) {
    this._action = val;
    this._fetched = false;
    if (this.isCloud) {
      this._response = this._action.response.action;
    } else {
      this._response = this._nlp;
    }
  }
  /**
   * @method execute
   * @param {String} from - the fetch to from
   */
  fetch(from) {
    let appState = this._app._state;
    if (this._fetched || 
      appState === 'paused' || 
      appState === 'beforeDestroy' || 
      appState === 'destroyed') {
      // FIXME(Yazhong): This function only could be called once.
      return;
    }
    if (this.response.intent === 'sleep') {
      this._app.exit();
    } else {
      const data = Object.assign({from}, this._nlp);
      this._app._options.onrequest.call(this._app, data, this);
    }
    this._fetched = true;
  }
}

exports.ActionComposer = ActionComposer;
