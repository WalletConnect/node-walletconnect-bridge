import { Router } from 'express'
import uuidv4 from 'uuid/v4'
import axios from 'axios'

import config from './config'
import * as keystore from './keystore'
import { getExpirationTime } from './time'

//
// Send push notification
//

function sendPushNotification(pushData, sessionId, callId, dappName) {
  const payload = {
    sessionId,
    callId,
    pushType: pushData.type,
    pushToken: pushData.token,
    dappName
  }

  return axios({
    url: pushData.endpoint,
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
  const { push, encryptionPayload } = req.body
  const { sessionId } = req.params
  try {
    // unencrypted details
    await keystore.setSessionDetails(sessionId, {
      push
    })

    // encrypted data
    await keystore.setSessionData(sessionId, encryptionPayload)

    const ttlInSeconds = config.walletconnect.sessionExpiration

    const expires = getExpirationTime(ttlInSeconds)

    return res.json({
      success: true,
      sessionId: sessionId,
      expires
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
    const details = await keystore.getSessionDetails(sessionId)
    const encryptionPayload = await keystore.getSessionData(sessionId)

    const ttlInSeconds = await keystore.getSessionExpiry(sessionId)
    const expires = getExpirationTime(ttlInSeconds)

    if (encryptionPayload && details) {
      return res.json({
        data: { encryptionPayload, expires, approved: details.approved }
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
  const { encryptionPayload, dappName = 'Unknown DApp' } = req.body
  try {
    const callData = { encryptionPayload, timestamp: Date.now() }
    await keystore.setCallRequest(callId, callData)
    await keystore.setTTL(
      keystore.getCallKey(callId),
      config.walletconnect.callExpiration
    )

    // notify wallet app using push notification
    const { push } = await keystore.getSessionDetails(sessionId)
    await sendPushNotification(push, sessionId, callId, dappName)

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
  const { encryptionPayload } = req.body
  try {
    await keystore.setCallStatus(callId, { encryptionPayload })

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
