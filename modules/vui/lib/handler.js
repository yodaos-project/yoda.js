'use strict';

/**
 * @class IntentRequestError
 * @extends Error
 */
class IntentRequestError extends Error {
  /**
   * @method constructor
   * @param {String} reason - the error description
   */
  constructor(reason) {
    reason = reason || 'intent request is invalid';
    super(`Invalid IntentRequest: ${reason}`);
  }
}

/**
 * @class SkillHandler
 */
class SkillHandler {
  /**
   * @method constructor
   * @param {Object} context - the nlp context
   * @param {Object} action - the action
   */
  constructor(context, action) {
    this._context = {};
    this._action = {};
    this._invalid = null;
    this._errmsg = null;
    try {
      if (context === '{}')
        throw new Error('empty nlp context');
      this._context = JSON.parse(context);
      this._action = JSON.parse(action);
      this._id = this._context.appId;
      if (!this._id) {
        throw new IntentRequestError('`appId` is required');
      }
    } catch (err) {
      this._invalid = true;
      this._errmsg = err && err.message;
    }
  }
  /**
   * @getter context
   */
  get context() {
    if (this._invalid)
      throw new IntentRequestError();
    return this._context;
  }
  /**
   * @getter action
   */
  get action() {
    if (this._invalid)
      throw new IntentRequestError();
    return this._action;
  }
  /**
   * @getter form
   */
  get form() {
    return this._context.form;
  }
  /**
   * @getter id
   */
  get id() {
    if (this._invalid)
      throw new IntentRequestError();
    return this._id;
  }
  /**
   * @getter valid
   */
  get valid() {
    return !this._invalid;
  }
  /**
   * @getter isCloud
   */
  get isCloud() {
    return !!this._context.cloud;
  }
}

exports.SkillHandler = SkillHandler;