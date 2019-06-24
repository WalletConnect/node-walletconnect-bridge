const RedisServer = require('redis-server')

const server = new RedisServer(6379)

server.open(error => {
  if (error) {
    throw error
  }

  console.log('Redis DEV server started!')
})

process.on('SIGTERM', () => {
  server.close(error => {
    if (error) {
      throw error
    }

    console.log('Redis DEV server closed!')
  })
})
