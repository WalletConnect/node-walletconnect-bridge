import { ISocketMessage, ISocketSub, IWebSocket, WebSocketData } from './types'
import { pushNotification } from './notification'

const subs: ISocketSub[] = []
let pubs: ISocketMessage[] = []
let hold: ISocketMessage[] = []

function log (type: string, message: string) {
  console.log({ log: true, type, message })
}

function isEmpty (arr: any[]) {
  return !(arr && arr.length)
}

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

const setHold = (socketMessage: ISocketMessage) => hold.push(socketMessage)
const getHold = (topic: string) => {
  const matching = hold.filter(held => held.topic === topic)
  hold = hold.filter(held => held.topic !== topic)
  return matching
}

function updateHold (topic: string) {
  let oldest = null
  const matching = getHold(topic)
  if (!isEmpty(matching)) {
    oldest = matching.shift()
    if (!isEmpty(matching)) {
      matching.forEach((socketMessage: ISocketMessage) =>
        setHold(socketMessage)
      )
    }
  }
  return oldest
}

function socketSendDirect (socket: IWebSocket, socketMessage: ISocketMessage) {
  const message = JSON.stringify(socketMessage)
  log('outgoing', message)
  socket.send(message)
}

function socketPush (socket: IWebSocket, socketMessage: ISocketMessage) {
  if (socket.readyState === 1) {
    socketSendDirect(socket, socketMessage)
    setHold(socketMessage)
  } else {
    setPub(socketMessage)
  }
}

const SubController = (socket: IWebSocket, socketMessage: ISocketMessage) => {
  const topic = socketMessage.topic

  const subscriber = { topic, socket }

  setSub(subscriber)

  const pending = getPub(topic)

  if (!isEmpty(pending)) {
    pending.forEach((pendingMessage: ISocketMessage) =>
      socketPush(socket, pendingMessage)
    )
  }

  const held = getHold(topic)

  if (!isEmpty(held)) {
    held.forEach((heldMessage: ISocketMessage) =>
      socketSendDirect(socket, heldMessage)
    )
  }
}

const PubController = (socketMessage: ISocketMessage) => {
  const subscribers = getSub(socketMessage.topic)

  if (!socketMessage.silent) {
    pushNotification(socketMessage.topic)
  }

  if (!isEmpty(subscribers)) {
    subscribers.forEach((subscriber: ISocketSub) =>
      socketPush(subscriber.socket, socketMessage)
    )
  } else {
    setPub(socketMessage)
  }
}

const AckController = (socketMessage: ISocketMessage) => {
  updateHold(socketMessage.topic)
}

export default (socket: IWebSocket, data: WebSocketData) => {
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
        SubController(socket, socketMessage)
        break
      case 'pub':
        PubController(socketMessage)
        break
      case 'ack':
        AckController(socketMessage)
        break
      default:
        break
    }
  } catch (e) {
    console.error(e)
  }
}
