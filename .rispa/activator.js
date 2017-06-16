import { start } from '@rispa/core/events'
import { server } from '../events'
import runServer from '../src/server'

const activator = on => {
  on(start(server), registry => {
    runServer(registry)
  })
}

export default activator
