import config from './config'

// redis client
const redisClient = config.redisClient

//
// redis utils
//

export function getSessionKey(sessionId) {
  return `session:${sessionId}`
}

export function getTransactionKey(sessionId, transactionId) {
  return `tx:${sessionId}:${transactionId}`
}

export function setTTL(key, n) {
  return redisClient.expireAsync(key, n)
}

export function getHashValue(key, field) {
  return redisClient.hgetAsync(key, field).then(data => {
    if (data) {
      return JSON.parse(data)
    }
  })
}

export function setHashValue(key, field, data = {}) {
  return redisClient.hsetAsync(key, field, JSON.stringify(data))
}

//
// session related getters and setters
//

export function getSessionRequest(sessionId) {
  return getHashValue(getSessionKey(sessionId), 'req')
}

export function getSessionDetails(sessionId) {
  return getHashValue(getSessionKey(sessionId), 'details') // unencrypted data
}

export function getSessionData(sessionId) {
  return getHashValue(getSessionKey(sessionId), 'data') // encrypted data
}

export function setSessionRequest(sessionId, data) {
  return setHashValue(getSessionKey(sessionId), 'req', data)
}

export function setSessionDetails(sessionId, data) {
  return setHashValue(getSessionKey(sessionId), 'details', data)
}

export function setSessionData(sessionId, data) {
  return setHashValue(getSessionKey(sessionId), 'data', data)
}

//
// tx related getters and setters
//

export function getTxRequest(sessionId, transactionId) {
  return getHashValue(getTransactionKey(sessionId, transactionId), 'req')
}

export function getTxStatus(sessionId, transactionId) {
  return getHashValue(getTransactionKey(sessionId, transactionId), 'status')
}

export function setTxRequest(sessionId, transactionId, data) {
  return setHashValue(getTransactionKey(sessionId, transactionId), 'req', data)
}

export function setTxStatus(sessionId, transactionId, data) {
  return setHashValue(
    getTransactionKey(sessionId, transactionId),
    'status',
    data
  )
}
