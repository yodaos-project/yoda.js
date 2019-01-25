module.exports.mockRuntime = mockRuntime
function mockRuntime () {
  return {
    component: {
      permission: {
        map: {},
        load: function load (appId, permissions) {
          this.map[appId] = permissions
        }
      }
    }
  }
}
