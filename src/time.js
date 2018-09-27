export function now() {
  return Date.now()
}

export function getExpirationTime(ttlInSeconds) {
  const expires = Number(now() + ttlInSeconds) * 1000
  return expires
}
