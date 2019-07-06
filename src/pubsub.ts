import WebSocket from 'ws'
import { ISocketMessage, ISocketSub } from './types'
import { pushNotification } from './notification'

const subs: ISocketSub[] = []
let pubs: ISocketMessage[] = []

const setSub = (subscriber: ISocketSub) => subs.push(subscriber)
const getSub = (topic: string) =>
  subs.filter(
    subscriber =>
      subscriber.topic === topic && subscriber.socket.readyState === 1
  )

const setPub = (socketMessage: ISocketMessage) => pubs.push(socketMessage)
const getPub = (topic: string) => {
  const matching = pubs.filter(pending => pending.topic === topic)
  pubs = pubs.filter(pending => pending.topic !== topic)
  return matching
}

export function socketSend (socket: WebSocket, socketMessage: ISocketMessage) {
  if (socket.readyState === 1) {
    console.log('OUT =>', socketMessage)
    socket.send(JSON.stringify(socketMessage))
  } else {
    setPub(socketMessage)
  }
}

export function pushPending (socket: WebSocket, topic: string) {
  const pending = getPub(topic)

  if (pending && pending.length) {
    pending.forEach((pendingMessage: ISocketMessage) =>
      socketSend(socket, pendingMessage)
    )
  }
}

export function handleStale (socket: WebSocket) {
  const matches = subs.filter(subscriber => subscriber.socket === socket)
  if (matches && matches.length) {
    matches.forEach((sub: ISocketSub) => {
      const { socket, topic } = sub
      pushPending(socket, topic)
    })
  }
}

const SubController = (socket: WebSocket, socketMessage: ISocketMessage) => {
  const topic = socketMessage.topic

  const subscriber = { topic, socket }

  setSub(subscriber)

  pushPending(socket, topic)
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
      return
    }

    if (message === 'pong') {
      return
    }

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
