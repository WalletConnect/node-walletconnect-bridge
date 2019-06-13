import WebSocket from 'ws'
import { ISocketMessage, ISocketSub } from './types'
import { pushNotification } from './notification'
import config from './config'

// redis client
const redisClient = config.redisClient

const setSub = (subscriber: ISocketSub) =>
  redisClient.lpushAsync(`subscriber:${subscriber.topic}`, JSON.stringify(subscriber))

export const getSub = (topic: string): ISocketSub[] => {
  return redisClient.lrangeAsync(`subscriber:${topic}`, 0, -1).then(data => {
    if (data) {
      let localData: ISocketSub[] = data.map((item: string) => JSON.parse(item))
      return localData.filter((subscriber: ISocketSub) => subscriber.socket.readyState === 1)
    }
  })
}

const setPub = (socketMessage: ISocketMessage) => {
  redisClient.lpushAsync(`socketMessage:${socketMessage.topic}`, JSON.stringify(socketMessage))
}
const getPub = (topic: string): ISocketMessage[] => {
  return redisClient.lrangeAsunc(`socketMessage:${topic}`, 0, -1).then(data => {
    if (data) {
      let localData: ISocketMessage[] = data.map((item: string) => JSON.parse(item))
      redisClient.del(`socketMessage:${topic}`)
      return localData
    }
  })
}

function socketSend (socket: WebSocket, socketMessage: ISocketMessage) {
  if (socket.readyState === 1) {
    console.log('OUT =>', socketMessage)
    socket.send(JSON.stringify(socketMessage))
  } else {
    setPub(socketMessage)
  }
}

const SubController = (socket: WebSocket, socketMessage: ISocketMessage) => {
  const topic = socketMessage.topic

  const subscriber = { topic, socket }

  setSub(subscriber)

  const pending = getPub(topic)

  if (pending && pending.length) {
    pending.forEach((pendingMessage: ISocketMessage) =>
      socketSend(socket, pendingMessage)
    )
  }
}

const PubController = (socketMessage: ISocketMessage) => {
  const subscribers = getSub(socketMessage.topic)

  // send push notifications
  pushNotification(socketMessage.topic)

  if (subscribers.length) {
    subscribers.forEach((subscriber: ISocketSub) =>
      socketSend(subscriber.socket, socketMessage)
    )
  } else {
    setPub(socketMessage)
  }
}

export default (socket: WebSocket, data: WebSocket.Data) => {
  const message: string = String(data)

  if (message) {
    if (message === 'ping') {
      if (socket.readyState === 1) {
        socket.send('pong')
      }
    } else {
      let socketMessage: ISocketMessage

      try {
        socketMessage = JSON.parse(message)

        console.log('IN  =>', socketMessage)

        switch (socketMessage.type) {
          case 'sub':
            SubController(socket, socketMessage)
            break
          case 'pub':
            PubController(socketMessage)
            break
          default:
            break
        }
      } catch (e) {
        console.error(e)
      }
    }
  }
}
