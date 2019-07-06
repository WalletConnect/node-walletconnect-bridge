import WebSocket from 'ws'

export interface ISocketMessage {
  topic: string
  type: string
  payload: string
  silent: boolean
}

export interface ISocketSub {
  topic: string
  socket: WebSocket
}

export interface INotification {
  topic: string
  webhook: string
}
