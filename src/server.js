import path from 'path'
import Express from 'express'
import compression from 'compression'
import favicon from 'serve-favicon'
import { devServer } from '@rispa/webpack'
import config from '@rispa/config'
import logger from './logger'

const runServer = registry => {
  const { host, port } = config.server
  const isProd = process.env.NODE_ENV === 'production'
  const app = new Express()

  //
  // common middlewares
  //

  app.use(compression())
  app.use(favicon(path.join(__dirname, '../static', 'favicon.ico')))

  if (isProd) {
    app.use(compression())
    app.use(config.publicPath, Express.static(config.outputPath))
  } else {
    devServer(app, registry.get('webpack.client'))
  }

  //
  // render middleware
  //

  const render = registry.get('render')
  if (render) {
    render(app, registry)
  } else {
    throw new Error('No render found')
  }

  //
  // start listen
  //

  app.listen(port, host, err => {
    if (err) {
      logger.error(err.message)
      return
    }

    logger.appStarted(port, host)
  })
}

export default runServer

