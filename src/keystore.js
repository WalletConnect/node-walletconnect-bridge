import config from './config'

// redis client
const redisClient = config.redisClient

//
// redis utils
//

export function getSessionKey(sessionId) {
  return `session:${sessionId}`
}

export function getCallKey(callId) {
  return `call:${callId}`
}

export function setTTL(key, n) {
  return redisClient.expireAsync(key, n)
}

export function getTTL(key) {
  return redisClient.ttlAsync(key)
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

export function getSessionExpiry(sessionId) {
  return getTTL(getSessionKey(sessionId))
}

//
// call related getters and setters
//

export function getCallRequest(callId) {
  return getHashValue(getCallKey(callId), 'req')
}

export function getCallStatus(callId) {
  return getHashValue(getCallKey(callId), 'status')
}

export function setCallRequest(callId, data) {
  return setHashValue(getCallKey(callId), 'req', data)
}

export function setCallStatus(callId, data) {
  return setHashValue(getCallKey(callId), 'status', data)
}
