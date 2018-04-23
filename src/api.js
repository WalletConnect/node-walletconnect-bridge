import {Router} from 'express'
import uuidv4 from 'uuid/v4'
import axios from 'axios'

import config from './config'
import * as keystore from './keystore'

// notification axios
const notificationAxios = axios.create({
  baseURL: config.fcm.url,
  timeout: 3000,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `key=${config.fcm.apiKey}`
  }
})

// get message body for given dapp name
function getMessageBody(dappName) {
  return `New request from ${dappName}`
}

//
// Send webhook
//

function sendWebHook(details, sessionId, transactionId, dappName) {
  const {fcmToken, walletWebhook} = details
  const payload = {
    sessionId,
    transactionId,
    fcmToken,
    dappName
  }

  return axios({
    url: walletWebhook,
    method: 'post',
    timeout: 3000,
    headers: {'Content-Type': 'application/json'},
    data: payload
  })
}

//
// Router
//

// create router
const router = Router()

// Add hello route
router.get('/hello', async(req, res) => {
  return res.send({
    message: 'Hello world, this is Wallet Connect v1'
  })
})

//
// Session router
//

const sessionRouter = Router()

// create new session
sessionRouter.post('/new', async(req, res) => {
  const sessionId = uuidv4()
  try {
    await keystore.setSessionRequest(sessionId)
    await keystore.setTTL(
      keystore.getSessionKey(sessionId),
      60 * 60 /* in seconds */
    )

    return res.status(201).json({
      sessionId
    })
  } catch (e) {
    return res.status(400).json({
      message: 'Error while writing to db'
    })
  }
})

sessionRouter.put('/:sessionId', async(req, res) => {
  const {fcmToken, walletWebhook, data} = req.body
  const sessionId = req.params.sessionId
  try {
    await keystore.setSessionDetails(sessionId, {
      fcmToken,
      walletWebhook
    })
    await keystore.setSessionData(sessionId, data)

    return res.json({
      success: true
    })
  } catch (e) {
    return res.status(400).json({
      message: 'Error while writing to db'
    })
  }
})

sessionRouter.get('/:sessionId', async(req, res) => {
  try {
    const data = await keystore.getSessionData(req.params.sessionId)
    if (data) {
      return res.json(data)
    }
  } catch (e) {
    return res.status(404).json({
      message: 'Session not found.'
    })
  }

  // no content
  return res.status(204).end()
})

//
// Transaction router
//

const transactionRouter = Router({mergeParams: true})

// create new transaction
transactionRouter.post('/new', async(req, res) => {
  const transactionId = uuidv4()
  const {sessionId} = req.params
  const data = req.body
  try {
    await keystore.setTxRequest(sessionId, transactionId, data)
    await keystore.setTTL(
      keystore.getTransactionKey(sessionId, transactionId),
      60 * 60 /* in seconds */
    )

    // notify wallet app using fcm
    const sessionDetails = await keystore.getSessionDetails(session_id)
    await sendWebHook(sessionDetails, sessionId, transactionId, data.dappName)

    // return transaction id
    return res.status(201).json({
      transactionId
    })
  } catch (e) {
    return res.status(400).json({
      message: 'Error while writing to db'
    })
  }
})

transactionRouter.put('/:transactionId', async(req, res) => {
  const {sessionId, transactionId} = req.params
  const data = req.body

  try {
    await keystore.setTxData(sessionId, transactionId, data)
    return res.json({
      success: true
    })
  } catch (e) {
    return res.status(400).json({
      message: 'Error while writing to db'
    })
  }
})

//
// Transaction status router
//

const transactionStatusRouter = Router({mergeParams: true})

// create new transaction status
transactionStatusRouter.post('/new', async(req, res) => {
  const {sessionId, transactionId} = req.params
  const data = req.body
  try {
    await keystore.setTxStatus(sessionId, transactionId, data)

    return res.status(201).json({
      success: true,
      transactionId: transactionId
    })
  } catch (e) {
    return res.status(400).json({
      message: 'Error while writing to db'
    })
  }
})

transactionStatusRouter.get('/', async(req, res) => {
  const {sessionId, transactionId} = req.params
  try {
    const result = await keystore.getTxStatus(sessionId, transactionId)
    if (result) {
      return res.json(result)
    }
  } catch (e) {
    return res.status(400).json({
      message: 'Error while reading from db'
    })
  }

  // no content
  return res.status(204).end()
})

//
// Notification
//

const notificationRouter = Router({mergeParams: true})
notificationRouter.post('/new', async(req, res) => {
  const {fcmToken, sessionId, transactionId, dappName} = req.body
  if (!fcmToken || !sessionId || !transactionId || !dappName) {
    return res.status(412).json({
      message: 'fcmToken, sessionId and transactionId required'
    })
  }

  // fcm payload
  const fcmPayload = {
    to: fcmToken,
    data: {sessionId, transactionId, dappName},
    notification: {
      body: getMessageBody(dappName)
    }
  }

  try {
    const response = await notificationAxios.post('', fcmPayload)
    // check status
    if (
      response.status === 200 &&
      response.data &&
      response.data.success === 1
    ) {
      return res.json({
        success: true
      })
    }
  } catch (e) {
    return req.status(400).json({
      message: 'Error while sending notification'
    })
  }

  return req.status(400).json({
    message: 'FCM server error, push notification failed'
  })
})

//
// Main router
//

// add session router to main Router
router.use('/session', sessionRouter)

// add transaction router to main Router
router.use('/session/:sessionId/transaction', transactionRouter)

// add transaction status router to main Router
router.use(
  '/session/:sessionId/transaction/:transactionId/status',
  transactionStatusRouter
)

// add notification router
router.use('/notification', notificationRouter)

// main router
export default router
