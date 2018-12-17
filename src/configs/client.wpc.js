const { group, env } = require('@webpack-blocks/webpack')

module.exports = group([
  env('development', [
    (context, { merge }) => merge({
      entry: {
        main: [
          require.resolve('webpack-hot-middleware/client'),
        ],
      },
    }),
  ]),
])
