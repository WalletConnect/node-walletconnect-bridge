import { Router } from 'express'
import uuidv4 from 'uuid/v4'
import axios from 'axios'

import config from './config'
import * as keystore from './keystore'

//
// Send push notification
//

function sendPushNotification(
  fcmToken,
  pushEndpoint,
  sessionId,
  transactionId,
  dappName
) {
  const payload = {
    sessionId,
    transactionId,
    fcmToken,
    dappName
  }

  return axios({
    url: pushEndpoint,
    method: 'POST',
    timeout: 3000,
    headers: { 'Content-Type': 'application/json' },
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
  return res.send('Hello World, this is WalletConnect')
})

//
// Session router
//

const sessionRouter = Router()

// create new session
sessionRouter.post('/new', async(req, res) => {
  const sessionId = uuidv4()
  try {
    await keystore.setSessionRequest(sessionId, req.body)
    await keystore.setTTL(
      keystore.getSessionKey(sessionId),
      config.walletconnect.sessionExpiration
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
  const { fcmToken, pushEndpoint, data } = req.body
  const { sessionId } = req.params
  try {
    // unencrypted details
    await keystore.setSessionDetails(sessionId, {
      fcmToken,
      pushEndpoint
    })

    // encrypted data
    await keystore.setSessionData(sessionId, data)

    return res.json({
      success: true,
      sessionId: sessionId,
      expiresInSeconds: config.walletconnect.sessionExpiration
    })
  } catch (e) {
    return res.status(400).json({
      message: 'Error while writing to db'
    })
  }
})

sessionRouter.get('/:sessionId', async(req, res) => {
  try {
    const { sessionId } = req.params
    const data = await keystore.getSessionData(sessionId)
    const expiresInSeconds = await keystore.getSessionExpiry(sessionId)
    if (data) {
      return res.json({
        data: { encryptionPayload: data, expiresInSeconds: expiresInSeconds }
      })
    }
  } catch (e) {
    return res.status(400).json({
      message: 'Error while getting session data'
    })
  }

  // no content
  return res.status(204).end()
})

//
// Transaction router
//

const transactionRouter = Router({ mergeParams: true })

// create new transaction
transactionRouter.post('/new', async(req, res) => {
  const transactionId = uuidv4()
  const { sessionId } = req.params
  const { data, dappName = 'Unknown DApp' } = req.body
  try {
    const txData = { encryptionPayload: data, timestamp: Date.now() }
    await keystore.setTxRequest(transactionId, txData)
    await keystore.setTTL(
      keystore.getTransactionKey(transactionId),
      config.walletconnect.txExpiration
    )

    // notify wallet app using push notification
    const { fcmToken, pushEndpoint } = await keystore.getSessionDetails(
      sessionId
    )
    await sendPushNotification(
      fcmToken,
      pushEndpoint,
      sessionId,
      transactionId,
      dappName
    )

    // return transaction id
    return res.status(201).json({
      transactionId
    })
  } catch (e) {
    let errorMessage
    if (e && e.response && e.response.data && e.response.data.message) {
      errorMessage =
        e && e.response && e.response.data && e.response.data.message
    }
    return res.status(400).json({
      message: errorMessage || 'Error while writing to db'
    })
  }
})

transactionRouter.get('/:transactionId', async(req, res) => {
  try {
    const { transactionId } = req.params
    const data = await keystore.getTxRequest(transactionId)
    if (data) {
      return res.json({
        data
      })
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
// Transaction status router
//

const transactionStatusRouter = Router({ mergeParams: true })

// create new transaction status
transactionStatusRouter.post('/new', async(req, res) => {
  const { transactionId } = req.params
  const { data } = req.body
  try {
    await keystore.setTxStatus(transactionId, data)

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
  const { transactionId } = req.params
  try {
    const data = await keystore.getTxStatus(transactionId)
    if (data) {
      return res.json({
        data
      })
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
// Main router
//

// add session router to main Router
router.use('/session', sessionRouter)

// add transaction router to main Router
router.use('/session/:sessionId/transaction', transactionRouter)

// add transaction status router to main Router
router.use('/transaction-status/:transactionId', transactionStatusRouter)

// main router
export default router
