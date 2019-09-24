require('@yoda/oh-my-little-pony')
  .catchUncaughtError(process.cwd() + '/test/stacktrace.result')

function main () {
  throw new Error('foobar')
}

if (require.main === module) {
  main()
}
