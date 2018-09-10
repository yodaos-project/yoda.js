module.exports.mockRuntime = mockRuntime
function mockRuntime () {
  return {
    permission: {
      map: {},
      load: function load (appId, permissions) {
        this.map[appId] = permissions
      }
    }
  }
}
