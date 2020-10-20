const env = process.env.NODE_ENV || 'development'
const debug = env !== 'production'
const port = process.env.PORT || (env === 'production' ? 5000 : 5001)
const host = process.env.HOST || `0.0.0.0:${port}`

const redis = {
  url: process.env.REDIS_URL || 'redis://localhost:6379/0',
  prefix: process.env.REDIS_PREFIX || 'walletconnect-bridge',
  expire: process.env.REDIS_EXPIRE || 3600*24
}

export default {
  env: env,
  debug: debug,
  port,
  host,
  redis
}
