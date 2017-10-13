const WebpackPluginApi = require('@rispa/webpack')
const ServerPlugin = require('../src/ServerPlugin')
const ServerPluginApi = require('../src/ServerPluginApi')

module.exports.default = ServerPlugin

module.exports.api = ServerPluginApi

module.exports.after = [WebpackPluginApi.pluginName]
