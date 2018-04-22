import express from 'express'
import bodyParser from 'body-parser'
import expressListRoutes from 'express-list-endpoints'

import localConfig from './config/index'
import router from './api'

const app = express()
const host = localConfig.app.host
const port = localConfig.app.port

// Set `port`
app.set('port', port)

// Body parser, to access req.body
app.use(bodyParser.json())

// Import API Routes
app.use('/', router)

// print all routes
expressListRoutes(router).forEach(p => {
  console.log(p.methods.join(','), p.path)
})

// Listen the server
app.listen(port)

// log server start event
console.log(`Server listening on ${host}:${port}`) // eslint-disable-line no-console
