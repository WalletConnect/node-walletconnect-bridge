import WebSocket from 'ws'
import { ISocketMessage, ISocketSub } from './types'
import { pushNotification } from './notification'
import { setSub, getSub, setPub, getPub } from './redis'

async function socketSend (socket: WebSocket, socketMessage: ISocketMessage) {
  if (socket.readyState === 1) {
    console.log('OUT =>', socketMessage)
    socket.send(JSON.stringify(socketMessage))
  } else {
    await setPub(socketMessage)
  }
}

const SubController = async (
  socket: WebSocket,
  socketMessage: ISocketMessage
) => {
  const topic = socketMessage.topic

  const subscriber = { topic, socket }

  await setSub(subscriber)

  const pending = await getPub(topic)

  if (pending && pending.length) {
    await Promise.all(
      pending.map(
        async (pendingMessage: ISocketMessage) =>
          await socketSend(socket, pendingMessage)
      )
    )
  }
}

const PubController = async (socketMessage: ISocketMessage) => {
  const subscribers = await getSub(socketMessage.topic)

  // send push notifications
  await pushNotification(socketMessage.topic)

  if (subscribers.length) {
    await Promise.all(
      subscribers.map(
        async (subscriber: ISocketSub) =>
          await socketSend(subscriber.socket, socketMessage)
      )
    )
  } else {
    await setPub(socketMessage)
  }
}

export default async (socket: WebSocket, data: WebSocket.Data) => {
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
            await SubController(socket, socketMessage)
            break
          case 'pub':
            await PubController(socketMessage)
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
