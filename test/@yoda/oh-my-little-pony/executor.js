require('@yoda/oh-my-little-pony').catchUncaughtError()

function main () {
  throw new Error('foobar')
}

if (require.main === module) {
  main()
}
