module.exports = {
  AppScheduler: {
    status: {
      notRunning: 'not running',
      creating: 'creating',
      running: 'running',
      suspending: 'suspending',
      error: 'error',
      exited: 'exited'
    },
    modes: {
      default: 0, // 0b00
      instrument: 1, // 0b01
      debug: 2 // 0b10
    }
  }
}
