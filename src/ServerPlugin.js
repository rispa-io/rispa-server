const path = require('path')
const Express = require('express')
const compression = require('compression')
const favicon = require('serve-favicon')
const { PluginInstance } = require('@rispa/core')
const ConfigPluginApi = require('@rispa/config').default
const WebpackPluginApi = require('@rispa/webpack')
const logger = require('./logger')

class ServerPlugin extends PluginInstance {
  constructor(context) {
    super(context)

    this.config = context.get(ConfigPluginApi.pluginName).getConfig()
    this.webpack = context.get(WebpackPluginApi.pluginName)

    this.favicon = path.join(__dirname, '../static', 'favicon.ico')
    this.renderMethod = null
  }

  setRenderMethod(renderMethod) {
    this.renderMethod = renderMethod
  }

  runServer() {
    const {
      publicPath,
      outputPath,
      server: {
        host,
        port,
      },
    } = this.config

    const app = new Express()

    //
    // common middlewares
    //
    app.use(compression())
    app.use(favicon(this.favicon))

    if (process.env.NODE_ENV === 'production') {
      app.use(compression())
      app.use(publicPath, Express.static(outputPath))
    } else {
      this.webpack.devServer(app)
    }

    //
    // render middleware
    //
    if (this.renderMethod) {
      this.renderMethod(app)
    } else {
      throw new Error('No render method found')
    }

    //
    // start listen
    //
    app.listen(port, host, err => {
      if (err) {
        logger.error(err.message)
      } else {
        logger.appStarted(port, host)
      }
    })
  }
}

module.exports = ServerPlugin
