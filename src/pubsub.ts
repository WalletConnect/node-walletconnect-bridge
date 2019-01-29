import WebSocket from 'ws'
import { ISocketMessage, ISocketSub } from './types'
import { getNotification } from './notification'

const subs: ISocketSub[] = []
const pubs: ISocketMessage[] = []

const setSub = (subscriber: ISocketSub) => subs.push(subscriber)
const getSub = (topic: string) =>
  subs.filter(subscriber => subscriber.topic === topic)

const setPub = (socketMessage: ISocketMessage) => pubs.push(socketMessage)
const getPub = (topic: string) =>
  pubs.filter(pending => pending.topic === topic)

function socketSend (socket: WebSocket, socketMessage: ISocketMessage) {
  if (socket.readyState === 1) {
    console.log('OUT =>', socketMessage)
    socket.send(JSON.stringify(socketMessage))
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
