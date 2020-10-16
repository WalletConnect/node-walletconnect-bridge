import fastify from 'fastify'
import Helmet from 'fastify-helmet'
import WebSocket from 'ws'
import config from './config'
import pubsub from './pubsub'
import { setNotification } from './keystore'
import { IWebSocket } from './types'
import pkg from '../package.json'

const app = fastify({
  logger: { prettyPrint: { forceColor: true } }
})

app.register(Helmet)

app.get('/health', (_, res) => {
  res.status(204).send()
})

app.get('/hello', (req, res) => {
  res.status(200).send(`Hello World, this is WalletConnect v${pkg.version}`)
})

app.get('/info', (req, res) => {
  res.status(200).send({
    name: pkg.name,
    description: pkg.description,
    version: pkg.version
  })
})

app.post('/subscribe', async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    res.status(400).send({
      message: 'Error: missing or invalid request body'
    })
  }

  const { topic, webhook } = req.body

  if (!topic || typeof topic !== 'string') {
    res.status(400).send({
      message: 'Error: missing or invalid topic field'
    })
  }

  if (!webhook || typeof webhook !== 'string') {
    res.status(400).send({
      message: 'Error: missing or invalid webhook field'
    })
  }

  await setNotification({ topic, webhook })

  res.status(200).send({
    success: true
  })
})

const wsServer = new WebSocket.Server({ server: app.server })

app.ready(() => {
  wsServer.on('connection', (socket: IWebSocket) => {
    socket.on('message', async data => {
      pubsub(socket, data, app.log)
    })

    socket.on('pong', () => {
      socket.isAlive = true
    })

    socket.on("error", (e: Error) => {
      if (!e.message.includes("Invalid WebSocket frame")) {
        throw e
      }
      app.log.warn({type: e.name, message: e.message})
    })
  })

  setInterval(
    () => {
      const sockets: any = wsServer.clients
      sockets.forEach((socket: IWebSocket) => {
        if (socket.isAlive === false) {
          return socket.terminate()
        }

        function noop () {}

        socket.isAlive = false
        socket.ping(noop)
      })
    },
    10000 // 10 seconds
  )
})

const [host, port] = config.host.split(':')
app.listen(+port, host, (err, address) => {
  if (err) throw err
  app.log.info(`Server listening on ${address}`)
})
