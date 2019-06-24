
import redis from 'redis'
import bluebird from 'bluebird'
import config from './default'

//
// Redis
//

// Promisifying redis
bluebird.promisifyAll(redis)
bluebird.promisifyAll(redis.Multi.prototype)

// redis setup and add to config
config.redis.prefix = `${config.redis.prefix}:`
const redisClient = redis.createClient(config.redis)

export default {
  ...config,
  redisClient
}
