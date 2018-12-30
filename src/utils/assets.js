const path = require('path')
const JSONFile = require('jsonfile')

const getAssets = (assetsByChunkName, publicPath) => {
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
}

const getProductionAssets = (outputPath, publicPath) => {
  try {
    const { assetsByChunkName } = JSONFile.readFileSync(path.resolve(outputPath, './stats.json'))

    return getAssets(assetsByChunkName, publicPath)
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('`stats.json` file not found, you need build client before launch start prod server')
    }

    throw error
  }
}

const compilerSubscribeToAssets = (compiler, publicPath, onChange) => {
  let onDone

  compiler.hooks.done.tap('ServerPlugin', stats => {
    const { assetsByChunkName } = stats.toJson({ errorDetails: false })
    const assets = getAssets(assetsByChunkName, publicPath)

    onChange(assets)

    if (onDone) {
      onDone()
      onDone = false
    }
  })

  return new Promise(resolve => {
    onDone = resolve
  })
}

module.exports = {
  getProductionAssets,
  compilerSubscribeToAssets,
}
