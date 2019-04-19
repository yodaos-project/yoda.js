var StepFlow = require('./index')
var seq = new StepFlow()

seq.use(
  'step1',
  function fn1 (ctx, next) {
    console.log('fn1:', ctx)
    ctx.fn1 = true
    next(null, { time: new Date() })
  },
  function fn11 (ctx, next, nextTo, data) {
    console.log('fn11:', ctx, data)
    ctx.fn11 = true
    next()
    // next('fn11 has some error.');
  }
)

seq
  .use('step2', function fn2 (ctx, next) {
    console.log('fn2:', ctx)
    ctx.fn2 = true
    next()
  })
  .use('step3', function fn3 (ctx, next) {
    console.log('fn3:', ctx)
    ctx.fn3 = true

    next()
  })
  .use('step4', function fn4 (ctx, next) {
    console.log('fn4:', ctx)
    ctx.fn4 = true
  })

seq
  .use('step2', function fn21 (ctx, next) {
    console.log('fn21:', ctx)
    ctx.fn21 = true
    next()
  })
  .use('step3', function fn31 (ctx, next) {
    console.log('fn31:', ctx)
    ctx.fn31 = true

    next()
  })
  .catch(function (err) {
    console.log('steps has error: ', err)
  })

var ctx = {
  initialized: true
}

seq.run(ctx, 'step1')
