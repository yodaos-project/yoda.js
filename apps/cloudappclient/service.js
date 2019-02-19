'use strict'

var _ = require('@yoda/util')._
var logger = require('logger')('cloudappclient/service')
var FloraComp = require('@yoda/flora/comp')

class CloudAppService {
  constructor (ctx) {
    this.ctx = ctx
    this.flora = new FloraComp('cloudappclient')
    this.flora.remoteMethods = {
      'rokid.skills.state': this.getState.bind(this),
      'rokid.skills.player': this.getPlayer.bind(this)
    }
  }
  start () {
    this.flora.init()
  }
  getState (req, res) {
    var application = {}
    return Promise.all(
      this.ctx.skillMgr.skills.map((skill) => {
        var future = Promise.resolve()
        var mediaId = this.ctx.playerMgr.getByAppId(skill.appId)
        var opts = {
          media: {
            state: 'IDLE'
          },
          voice: {
            state: 'IDLE'
          }
        }
        if (!skill.paused && this.ctx.ttsClient.isPlaying) {
          opts.voice.state = 'PLAYING'
        }

        var selectMedia = directive => {
          return directive.type === 'media' && directive.action === 'play'
        }
        var mediaDirective = (skill.lastDirectives.filter(selectMedia) || []).slice(-1)[0]
        if (mediaDirective) {
          future = future.then(() => {
            return this.ctx.activity.media.getState(mediaId)
          }).then((mediaState) => {
            mediaState = JSON.parse(mediaState)
            opts.media = Object.assign({
              itemId: _.get(mediaDirective, 'data.item.itemId', undefined),
              progress: mediaState.position
            }, mediaState)
          })
        }
        return future.then(() => {
          application[skill.appId] = opts
        })
      })
    ).then(() => {
      logger.info('skill options application >', application)
      res.end(0, [ JSON.stringify(application) ])
    }, err => {
      logger.error('getstate failed with the error', err)
      res.end(0, [ '{}' ])
    })
  }
  /**
   * for debug and test: get playerId map
   *
   * @param {*} req
   * @param {*} res
   * @memberof CloudAppService
   */
  getPlayer (req, res) {
    var result = JSON.stringify(this.ctx.playerMgr.handle)
    res.end(0, [ result ])
  }
}

module.exports = CloudAppService
