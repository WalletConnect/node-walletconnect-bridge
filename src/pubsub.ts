import { ISocketMessage, ISocketSub, IWebSocket, WebSocketData } from "./types";
import { pushNotification } from "./notification";

const subs: ISocketSub[] = [];
let pubs: ISocketMessage[] = [];

function log(type: string, message: string) {
  console.log({ log: true, type, message });
}

const setSub = (subscriber: ISocketSub) => subs.push(subscriber);
const getSub = (topic: string) =>
  subs.filter(subscriber => subscriber.topic === topic && subscriber.socket.readyState === 1);

const setPub = (socketMessage: ISocketMessage) => pubs.push(socketMessage);
const getPub = (topic: string) => {
  const matching = pubs.filter(pending => pending.topic === topic);
  pubs = pubs.filter(pending => pending.topic !== topic);
  return matching;
};

function socketSend(socket: IWebSocket, socketMessage: ISocketMessage) {
  if (socket.readyState === 1) {
    const message = JSON.stringify(socketMessage);
    log("outgoing", message);
    socket.send(message);
  } else {
    setPub(socketMessage);
  }
}

const SubController = (socket: IWebSocket, socketMessage: ISocketMessage) => {
  const topic = socketMessage.topic;

  const subscriber = { topic, socket };

  setSub(subscriber);

  const pending = getPub(topic);

  if (pending && pending.length) {
    pending.forEach((pendingMessage: ISocketMessage) => socketSend(socket, pendingMessage));
  }
};

const PubController = (socketMessage: ISocketMessage) => {
  const subscribers = getSub(socketMessage.topic);

  if (!socketMessage.silent) {
    pushNotification(socketMessage.topic);
  }

  if (subscribers.length) {
    subscribers.forEach((subscriber: ISocketSub) => socketSend(subscriber.socket, socketMessage));
  } else {
    setPub(socketMessage);
  }
};

export default (socket: IWebSocket, data: WebSocketData) => {
  const message = String(data);
  if (!message || !message.trim()) {
    return;
  }

  log("incoming", message);

  try {
    let socketMessage: ISocketMessage | null = null;

    try {
      socketMessage = JSON.parse(message);
    } catch (e) {
      // do nothing
    }

    if (!socketMessage) {
      return;
    }

    switch (socketMessage.type) {
      case "sub":
        SubController(socket, socketMessage);
        break;
      case "pub":
        PubController(socketMessage);
        break;
      default:
        break;
    }
  } catch (e) {
    console.error(e);
  }
};
