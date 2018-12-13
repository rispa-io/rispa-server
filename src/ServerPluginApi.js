const { PluginApi } = require('@rispa/core')

class ServerPluginApi extends PluginApi {
  static startHandler(context) {
    const instance = context.get(ServerPluginApi.pluginName)
    instance.runServer()
  }

  runServer() {
    this.instance.runServer()
  }
}

ServerPluginApi.pluginName = '@rispa/server'

module.exports = ServerPluginApi
