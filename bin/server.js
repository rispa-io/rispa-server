const { init } = require('@rispa/core')
const { startHandler } = require('../src/ServerPluginApi')

init(startHandler)
