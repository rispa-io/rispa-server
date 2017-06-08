import runServer from '../src/server'

const activator = on => {
  on('start', (command, registry) => {
    if (command === 'server') {
      runServer(registry)
    }
  })
}

export default activator
