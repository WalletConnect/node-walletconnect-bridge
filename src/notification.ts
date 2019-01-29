import axios from 'axios'
import { INotification } from './types'

const notifications: INotification[] = []

export const setNotification = (notification: INotification) =>
  notifications.push(notification)
export const getNotification = (topic: string) =>
  notifications.filter(notification => notification.topic === topic)

export const pushNotification = (topic: string) => {
  const notifications = getNotification(topic)

  if (notifications && notifications.length) {
    notifications.forEach((notification: INotification) =>
      axios.post(notification.webhook, { topic })
    )
  }
}
