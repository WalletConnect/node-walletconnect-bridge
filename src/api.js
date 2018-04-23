import {Router} from 'express'
import uuidv4 from 'uuid/v4'
import axios from 'axios'

import * as keystore from './keystore'

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

// main router
export default router
