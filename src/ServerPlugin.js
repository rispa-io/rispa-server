const path = require('path')
const Express = require('express')
const compression = require('compression')
const favicon = require('serve-favicon')
const { PluginInstance } = require('@rispa/core')
const ConfigPluginApi = require('@rispa/config').default
const WebpackPluginApi = require('@rispa/webpack')
const RenderClientPluginApi = require('@rispa/render-client')
const webpackDevMiddleware = require('webpack-dev-middleware')
const webpackHotMiddleware = require('webpack-hot-middleware')

const logger = require('./logger')

class ServerPlugin extends PluginInstance {
  constructor(context) {
    super(context)

    this.config = context.get(ConfigPluginApi.pluginName).getConfig()
    this.webpack = context.get(WebpackPluginApi.pluginName)
    this.clientRender = context.get(RenderClientPluginApi.pluginName)
    this.favicon = path.join(__dirname, '../static', 'favicon.ico')
    this.app = new Express()
    this.devServer = this.devServer.bind(this)
    this.runServer = this.runServer.bind(this)
  }

  devServer(app) {
    const {
      publicPath,
    } = this.config
    const compiler = this.webpack.getCompiler('client')

    const middleware = webpackDevMiddleware(compiler, {
      publicPath,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      stats: {
        colors: true,
      },
      logTime: true,
      logLevel: 'warn',
      serverSideRender: true,
    })

    app.use(middleware)
    app.use(webpackHotMiddleware(compiler))

    compiler.hooks.done.tap('ServerPlugin', (stats => {
      try {
        const names = Object
          .keys(stats.compilation.assets)
          .filter(script => /\.js$/.test(script))
          .map(script => `${publicPath.replace(/\/$/, '')}/${script}`)
          .reduce((result, script) => {
            if (/vendor/.test(script)) {
              result.vendor = script
            } else if (/polyfill/.test(script)) {
              result.polyfill = script
            } else {
              result.chunks.push(script)
            }
            return result
          }, { chunks: [] })
        const render = this.clientRender.render(names)
        this.app.use('*', (req, res) => {
          const html = render(req)
          res.send(html)
        })
      } catch (error) {
        logger(error)
      }
    }))
  }

  prodServer(app) {
    const {
      publicPath,
      outputPath,
    } = this.config

    app.use(compression())
    app.use(favicon(this.favicon))
    app.use(publicPath, Express.static(outputPath))
  }

  runServer() {
    if (process.env.NODE_ENV === 'development') {
      this.devServer(this.app)
    } else {
      this.prodServer(this.app)
    }
    const {
      server: {
        host,
        port,
      },
    } = this.config

    this.app.listen(port, host, err => {
      if (err) {
        logger.error(err.message)
      } else {
        logger.appStarted(port, host)
      }
    })
  }
}

module.exports = ServerPlugin
