module.exports = {
  AppScheduler: {
    status: {
      notRunning: 'not running',
      creating: 'creating',
      running: 'running',
      destructing: 'destructing',
      exited: 'exited'
    },
    modes: {
      default: 0, // 0b00
      test: 1, // 0b01
      debug: 2 // 0b10
    }
  }
}
