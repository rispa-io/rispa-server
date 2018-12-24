const { createLogger } = require('@rispa/core')

const logger = createLogger('@rispa/server')

logger.appStarted = (port, host) => {
  const uri = `http://${host}:${port}`
  logger.info(`Project is running at ${logger.colors.magenta(uri)}`)
}

module.exports = logger
