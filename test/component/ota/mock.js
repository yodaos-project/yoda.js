module.exports.mockRuntime = mockRuntime
function mockRuntime () {
  return {
    setMicMute: () => {},
    setPickup: () => {},
    openUrl: () => {},
    startMonologue: () => {},
    component: {
      lifetime: {
        isMonopolized: () => false
      }
    }
  }
}
