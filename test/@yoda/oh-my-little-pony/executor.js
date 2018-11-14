require('@yoda/oh-my-little-pony')

function main () {
  throw new Error('foobar')
}

if (require.main === module) {
  main()
}
