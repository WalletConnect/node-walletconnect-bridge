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
  callId,
  dappName
) {
  const payload = {
    sessionId,
    callId,
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
// Call router
//

const callRouter = Router({ mergeParams: true })

// create new call
callRouter.post('/new', async(req, res) => {
  const callId = uuidv4()
  const { sessionId } = req.params
  const { data, dappName = 'Unknown DApp' } = req.body
  try {
    const callData = { encryptionPayload: data, timestamp: Date.now() }
    await keystore.setCallRequest(callId, callData)
    await keystore.setTTL(
      keystore.getCallKey(callId),
      config.walletconnect.callExpiration
    )

    // notify wallet app using push notification
    const { fcmToken, pushEndpoint } = await keystore.getSessionDetails(
      sessionId
    )
    await sendPushNotification(
      fcmToken,
      pushEndpoint,
      sessionId,
      callId,
      dappName
    )

    // return call id
    return res.status(201).json({
      callId
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

callRouter.get('/:callId', async(req, res) => {
  try {
    const { callId } = req.params
    const data = await keystore.getCallRequest(callId)
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
// Call status router
//

const callStatusRouter = Router({ mergeParams: true })

// create new call status
callStatusRouter.post('/new', async(req, res) => {
  const { callId } = req.params
  const { data } = req.body
  try {
    await keystore.setCallStatus(callId, { encryptionPayload: data })

    return res.status(201).json({
      success: true,
      callId: callId
    })
  } catch (e) {
    return res.status(400).json({
      message: 'Error while writing to db'
    })
  }
})

callStatusRouter.get('/', async(req, res) => {
  const { callId } = req.params
  try {
    const data = await keystore.getCallStatus(callId)
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

// add call router to main Router
router.use('/session/:sessionId/call', callRouter)

// add call status router to main Router
router.use('/call-status/:callId', callStatusRouter)

// main router
export default router
