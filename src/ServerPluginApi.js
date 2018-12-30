const { PluginApi } = require('@rispa/core')
const errors = require('./errors')

class ServerPluginApi extends PluginApi {
  static startHandler(context) {
    const instance = context.get(ServerPluginApi.pluginName)
    const { side } = require('minimist')(process.argv.slice(2))

    return instance.runServer(side)
  }

  setClientRender(render) {
    this.instance.setClientRender(render)
  }

  setServerRender(render) {
    this.instance.setServerRender(render)
  }

  runServer(side) {
    return this.instance.runServer(side)
  }
}

ServerPluginApi.pluginName = '@rispa/server'

ServerPluginApi.errors = errors

module.exports = ServerPluginApi
