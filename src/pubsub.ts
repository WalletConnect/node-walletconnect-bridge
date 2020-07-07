import { ISocketMessage, ISocketSub, IWebSocket, WebSocketData,Logger } from './types'
import { pushNotification } from './notification'
import { setSub, getSub, setPub, getPub } from './keystore'

async function socketSend (socket: IWebSocket, socketMessage: ISocketMessage , logger: Logger) {
  if (socket.readyState === 1) {
    const message = JSON.stringify(socketMessage)
    socket.send(message)
    logger.info({ type: 'outgoing', message })
  } else {
    await setPub(socketMessage)
  }
}

async function SubController (
  socket: IWebSocket,
  socketMessage: ISocketMessage,
  logger: Logger
) {
  const topic = socketMessage.topic

  const subscriber = { topic, socket }

  await setSub(subscriber)

  const pending = await getPub(topic)

  if (pending && pending.length) {
    await Promise.all(
      pending.map((pendingMessage: ISocketMessage) =>
        socketSend(socket, pendingMessage, logger)
      )
    )
  }
}

async function PubController (socketMessage: ISocketMessage, logger: Logger) {
  const subscribers = await getSub(socketMessage.topic)

  if (!socketMessage.silent) {
    await pushNotification(socketMessage.topic)
  }

  if (subscribers.length) {
    await Promise.all(
      subscribers.map((subscriber: ISocketSub) =>
        socketSend(subscriber.socket, socketMessage, logger)
      )
    )
  } else {
    await setPub(socketMessage) 
  }
}

export default async (socket: IWebSocket, data: WebSocketData, logger: Logger) => {
  const message: string = String(data)

  if (!message || !message.trim()) {
    return
  }

  logger.info({ type: 'incoming', message })

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
        await SubController(socket, socketMessage, logger)
        break
      case 'pub':
        await PubController(socketMessage, logger)
        break
      default:
        break
    }
  } catch (e) {
    console.error(e)
  }
}
