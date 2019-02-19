var getRuntime = () => ({
  component: {
    lifetime: {
      getCurrentAppId: () => undefined
    },
    turen: {
      pickup: () => undefined
    }
  },
  openUrl: () => Promise.resolve()
})
module.exports.getRuntime = getRuntime

module.exports.sendInfo = sendInfo
function sendInfo (battery, data) {
  var ret = Object.assign({
    batSupported: true,
    batChargingOnline: false
  }, data)
  var str = JSON.stringify(ret)
  battery.handleFloraInfo([str])
  return ret
}
