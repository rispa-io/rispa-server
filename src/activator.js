const ConfigPluginApi = require('@rispa/config').default
const WebpackPluginApi = require('@rispa/webpack')
const RenderClientPluginApi = require('@rispa/render-client')

const ServerPlugin = require('../src/ServerPlugin')
const ServerPluginApi = require('../src/ServerPluginApi')

module.exports.default = ServerPlugin

module.exports.api = ServerPluginApi

module.exports.after = [
  ConfigPluginApi.pluginName,
  WebpackPluginApi.pluginName,
  RenderClientPluginApi.pluginName,
]
