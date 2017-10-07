const WebpackPluginApi = require('@rispa/webpack')
const ServerPlugin = require('../src/ServerPlugin')
const ServerPluginApi = require('../src/ServerPluginApi')

function init(context, config) {
  return new ServerPlugin(context, config)
}

function api(instance) {
  return new ServerPluginApi(instance)
}

const after = [WebpackPluginApi.pluginName]

module.exports = init

module.exports.api = api
