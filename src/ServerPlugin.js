const path = require('path')
const Express = require('express')
const compression = require('compression')
const favicon = require('serve-favicon')
const JSONFile = require('jsonfile')
const { PluginInstance, createLogger } = require('@rispa/core')
const ConfigPluginApi = require('@rispa/config').default
const WebpackPluginApi = require('@rispa/webpack')
const clientWebpackConfig = require('./configs/client.wpc')

const logger = require('./logger')

const emptyRender = side => () => {
  logger.error(new Error(`${side} side render not specified, see more (https://github.com/rispa-io/rispa-server/)`))

  process.exit(1)
}

const getAssets = (assetsByChunkName, publicPath) => {
  try {
    const assetPublicPath = publicPath.replace(/\/$/, '')

    const compiledAssets = Object.values(assetsByChunkName)
      .reduce((result, chunk) => result.concat(chunk), [])
      .map(item => `${assetPublicPath}/${item}`)
      .reduce((assets, item) => {
        if (/\.css$/.test(item)) {
          assets.css.push(item)
        } else if (/\.js$/.test(item)) {
          if (/vendors/.test(item)) {
            assets.js.vendors.push(item)
          } else {
            assets.js.chunks.push(item)
          }
        }

        return assets
      }, { css: [], js: { vendors: [], chunks: [] } })

    return compiledAssets
  } catch (error) {
    logger.error(error)

    process.exit(1)

    throw error
  }
}

class ServerPlugin extends PluginInstance {
  constructor(context) {
    super(context)
    this.clientRender = emptyRender('Client')
    this.serverRender = emptyRender('Server')
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

  getRender(side) {
    if (side === 'client') {
      return this.clientRender
    } else if (side === 'server') {
      return this.serverRender
    }

    throw new Error(`Invalid render side "${side}"`)
  }

  devServer(app) {
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
      serverSideRender: true,
      index: false,
    }))
    app.use(require('webpack-hot-middleware')(compiler))

    let onDone
    compiler.hooks.done.tap('ServerPlugin', stats => {
      const { assetsByChunkName } = stats.toJson()
      this.assets = getAssets(assetsByChunkName, publicPath)

      if (onDone) {
        onDone()
        onDone = false
      }
    })

    return new Promise(resolve => {
      onDone = resolve
    })
  }

  prodServer(app) {
    const {
      publicPath,
      outputPath,
    } = this.config

    app.use(compression())
    app.use(favicon(this.favicon))
    app.use(publicPath, Express.static(outputPath))

    try {
      const { assetsByChunkName } = JSONFile.readFileSync(path.resolve(outputPath, './stats.json'))

      this.assets = getAssets(assetsByChunkName, publicPath)
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('`stats.json` file not found, you need build client before launch start prod server')
      }

      throw error
    }
  }

  async runServer(side = 'client') {
    const {
      server: {
        host,
        port,
      },
    } = this.config

    const app = new Express()
    const render = this.getRender(side)

    if (process.env.NODE_ENV === 'development') {
      await this.devServer(app)
    } else {
      await this.prodServer(app)
    }

    app.use('*', async (req, res) => {
      try {
        const html = await render(req, this.assets)
        res.send(html)
      } catch (error) {
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
