import fastify from 'fastify'
import Helmet from 'fastify-helmet'
import WebSocket from 'ws'
import config from './config'
import pubsub from './pubsub'
import { setNotification } from './notification'
import pkg from '../package.json'

const app = fastify({ logger: config.debug })

app.register(Helmet)

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

app.post('/subscribe', (req, res) => {
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

  setNotification({ topic, webhook })

  res.status(200).send({
    success: true
  })
})

const wsServer = new WebSocket.Server({ server: app.server })

app.ready(() => {
  wsServer.on('connection', (socket: WebSocket) => {
    socket.on('message', async data => {
      pubsub(socket, data)
    })
  })
})

app.listen(config.port, (error: Error) => {
  if (error) {
    return console.log('Something went wrong', error)
  }

  console.log('Server listening on port', config.port)
})
