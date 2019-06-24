import axios from 'axios'
import { INotification } from './types'
import config from './config'

// redis client
const redisClient = config.redisClient

export const setNotification = (notification: INotification) =>
  redisClient.lpushAsync(`notification:${notification.topic}`, JSON.stringify(notification))

export const getNotification = (topic: string) => {
  return redisClient.lrangeAsync(`notification:${topic}`, 0, -1).then(data => {
    if (data) {
      return data
    }
  })
}

export const pushNotification = (topic: string) => {
  const notifications = getNotification(topic).map((item: string) => JSON.parse(item))

  if (notifications && notifications.length) {
    notifications.forEach((notification: INotification) =>
      axios.post(notification.webhook, { topic })
    )
  }
}
