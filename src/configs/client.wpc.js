const { group, env } = require('@webpack-blocks/webpack')

module.exports = group([
  env('development', [
    (context, { merge }) => merge({
      entry: {
        client: [
          require.resolve('webpack-hot-middleware/client'),
        ],
      },
    }),
  ]),
])
