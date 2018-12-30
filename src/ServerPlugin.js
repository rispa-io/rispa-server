const Express = require('express')
const { PluginInstance, createLogger } = require('@rispa/core')
const ConfigPluginApi = require('@rispa/config').default
const WebpackPluginApi = require('@rispa/webpack')

const clientWebpackConfig = require('./configs/client.wpc')
const { getProductionAssets, compilerSubscribeToAssets } = require('./utils/assets')
const logger = require('./logger')
const { Redirect } = require('./errors')

const emptyRender = side => () => {
  logger.error(new Error(`${side} side render not specified, see more (https://github.com/rispa-io/rispa-server/)`))

  process.exit(1)
}

class ServerPlugin extends PluginInstance {
  constructor(context) {
    super(context)
    this.clientRender = emptyRender('Client')
    this.serverRender = emptyRender('Server')
    this.assets = undefined

    this.config = context.get(ConfigPluginApi.pluginName).getConfig()
    this.webpack = context.get(WebpackPluginApi.pluginName)
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

  createRender(side) {
    if (side === 'client') {
      return this.clientRender()
    } else if (side === 'server') {
      return this.serverRender()
    }

    throw new Error(`Invalid render side "${side}"`)
  }

  useDevServer(app) {
    const {
      publicPath,
    } = this.config

    const compiler = this.webpack.getClientCompiler()

    app.use(require('webpack-dev-middleware')(compiler, {
      publicPath,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      stats: {
        colors: true,
      },
      logger: createLogger('@rispa/webpack-dev'),
      index: false,
    }))
    app.use(require('webpack-hot-middleware')(compiler))

    return compilerSubscribeToAssets(compiler, publicPath, assets => {
      this.assets = assets
    })
  }

  useProdServer(app) {
    const {
      publicPath,
      outputPath,
    } = this.config

    app.use(require('compression')())
    app.use(publicPath, Express.static(outputPath))

    this.assets = getProductionAssets(outputPath, publicPath)
  }

  async runServer(side = 'client') {
    const {
      server: {
        host,
        port,
      },
    } = this.config

    const app = new Express()

    if (process.env.NODE_ENV === 'development') {
      await this.useDevServer(app)
    } else {
      await this.useProdServer(app)
    }

    const render = await this.createRender(side)

    app.use('*', async (req, res) => {
      try {
        const html = await render(req, this.assets)

        return res.send(html)
      } catch (error) {
        if (error instanceof Redirect) {
          return res.redirect(302, error.newLocation)
        }

        logger.error(error)

        res.send(error.message || error)
      }
    })

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
