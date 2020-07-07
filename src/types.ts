import WebSocket from 'ws'

export { Logger } from 'fastify'

export type WebSocketData = WebSocket.Data

export interface IWebSocket extends WebSocket {
  isAlive: boolean
}

export interface ISocketMessage {
  topic: string
  type: string
  payload: string
  silent: boolean
}

export interface ISocketSub {
  topic: string
  socket: IWebSocket
}

export interface INotification {
  topic: string
  webhook: string
}
