import redis from 'redis'
import { ISocketMessage, ISocketSub, INotification } from './types'
import bluebird from 'bluebird'
import config from './config'

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)

const redisClient: any = redis.createClient(config.redis)

export const setSub = (subscriber: ISocketSub) =>
  redisClient.lpushAsync(
    `subscriber:${subscriber.topic}`,
    JSON.stringify(subscriber)
  )

export const getSub = (topic: string): ISocketSub[] => {
  return redisClient
    .lrangeAsync(`subscriber:${topic}`, 0, -1)
    .then((data: any) => {
      if (data) {
        let localData: ISocketSub[] = data.map((item: string) =>
          JSON.parse(item)
        )
        return localData.filter(
          (subscriber: ISocketSub) => subscriber.socket.readyState === 1
        )
      }
    })
}

export const setPub = (socketMessage: ISocketMessage) => {
  redisClient.lpushAsync(
    `socketMessage:${socketMessage.topic}`,
    JSON.stringify(socketMessage)
  )
}
export const getPub = (topic: string): ISocketMessage[] => {
  return redisClient
    .lrangeAsync(`socketMessage:${topic}`, 0, -1)
    .then((data: any) => {
      if (data) {
        let localData: ISocketMessage[] = data.map((item: string) =>
          JSON.parse(item)
        )
        redisClient.del(`socketMessage:${topic}`)
        return localData
      }
    })
}

export const setNotification = (notification: INotification) =>
  redisClient.lpushAsync(
    `notification:${notification.topic}`,
    JSON.stringify(notification)
  )

export const getNotification = (topic: string) => {
  return redisClient
    .lrangeAsync(`notification:${topic}`, 0, -1)
    .then((data: any) => {
      if (data) {
        return data.map((item: string) => JSON.parse(item))
      }
    })
}
