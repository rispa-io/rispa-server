const path = require('path')
const Express = require('express')
const compression = require('compression')
const favicon = require('serve-favicon')
const { PluginInstance } = require('@rispa/core')
const ConfigPluginApi = require('@rispa/config').default
const WebpackPluginApi = require('@rispa/webpack')
const clientWebpackConfig = require('./configs/client.wpc')

const logger = require('./logger')

class ServerPlugin extends PluginInstance {
  constructor(context) {
    super(context)
    this.clientRender = undefined
    this.serverRender = undefined
    this.app = new Express()
    this.assets = undefined

    this.config = context.get(ConfigPluginApi.pluginName).getConfig()
    this.webpack = context.get(WebpackPluginApi.pluginName)
    this.favicon = path.join(__dirname, '../static', 'favicon.ico')
    this.devServer = this.devServer.bind(this)
    this.runServer = this.runServer.bind(this)
    this.setClientRender = this.setClientRender.bind(this)
    this.setServerRender = this.setServerRender.bind(this)
  }

  start() {
    this.webpack.addClientConfig(clientWebpackConfig)
  }

  setClientRender(render) {
    this.clientRender = render
  }

  setServerRender(render) {
    this.serverRender = render
  }

  devServer(app) {
    const {
      publicPath,
    } = this.config
    const compiler = this.webpack.getCompiler('client')

    app.use(require('webpack-dev-middleware')(compiler, {
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
    }))

    app.use(require('webpack-hot-middleware')(compiler))

    compiler.hooks.done.tap('ServerPlugin', (stats => {
      try {
        this.assets = Object
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
      } catch (error) {
        logger.error(error)
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
    const {
      server: {
        host,
        port,
      },
    } = this.config

    let render
    if (process.env.DISABLE_SSR) {
      if (!this.clientRender) {
        throw new Error('Client side render not specified, see more (https://github.com/rispa-io/rispa-server/)')
      }

      render = this.clientRender(assets)
    } else {
      if (!this.serverRender) {
        throw new Error('Server side render not specified, see more (https://github.com/rispa-io/rispa-server/)')
      }

      render = this.serverRender(assets)
    }

    if (process.env.NODE_ENV === 'development') {
      this.devServer(this.app)
    } else {
      this.prodServer(this.app)
    }

    this.app.use('*', (req, res) => {
      const html = render(req, this.assets)
      res.send(html)
    })

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
