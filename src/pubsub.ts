import { ISocketMessage, ISocketSub, IWebSocket, WebSocketData } from './types'
import { pushNotification } from './notification'
import { setSub, getSub, setPub, getPub } from './keystore'

function log (type: string, message: string) {
  console.log({ log: true, type, message })
}

export async function socketSend (
  socket: IWebSocket,
  socketMessage: ISocketMessage
) {
  if (socket.readyState === 1) {
    const message = JSON.stringify(socketMessage)
    log('outgoing', message)
    socket.send(message)
  } else {
    await setPub(socketMessage)
  }
}

export async function pushPending (socket: IWebSocket, topic: string) {
  const pending = await getPub(topic)

  if (pending && pending.length) {
    await Promise.all(
      pending.map((pendingMessage: ISocketMessage) =>
        socketSend(socket, pendingMessage)
      )
    )
  }
}

async function SubController (
  socket: IWebSocket,
  socketMessage: ISocketMessage
) {
  const topic = socketMessage.topic

  const subscriber = { topic, socket }

  await setSub(subscriber)

  await pushPending(socket, topic)
}

async function PubController (socketMessage: ISocketMessage) {
  const subscribers = await getSub(socketMessage.topic)

  if (!socketMessage.silent) {
    await pushNotification(socketMessage.topic)
  }

  if (subscribers.length) {
    await Promise.all(
      subscribers.map((subscriber: ISocketSub) =>
        socketSend(subscriber.socket, socketMessage)
      )
    )
  } else {
    await setPub(socketMessage)
  }
}

export default async (socket: IWebSocket, data: WebSocketData) => {
  const message: string = String(data)
  if (!message || !message.trim()) {
    return
  }

  log('incoming', message)

  try {
    let socketMessage: ISocketMessage | null = null

    try {
      socketMessage = JSON.parse(message)
    } catch (e) {
      // do nothing
    }

    if (!socketMessage) {
      return
    }

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
