import redis from 'redis'
import bluebird from 'bluebird'
import config from './default'

//
// Redis
//

// Promisifying redis
bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)

// redis setup and add to config
config.redis.prefix = `${config.redis.prefix}:`
config.redisClient = redis.createClient(config.redis)

export default config
