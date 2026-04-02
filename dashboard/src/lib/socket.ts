import { io, type Socket } from "socket.io-client"
import { getAccessToken } from "./api"

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? "" : "http://localhost:3001")

let chatSocket: Socket | null = null
let marketSocket: Socket | null = null

export function getSocket(): Socket {
  if (!chatSocket) {
    chatSocket = io(`${SOCKET_URL}/chat`, {
      auth: { token: getAccessToken() },
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    })
  }
  return chatSocket
}

export function getMarketSocket(): Socket {
  if (!marketSocket) {
    marketSocket = io(`${SOCKET_URL}/market`, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    })
  }
  return marketSocket
}

export function connectSocket() {
  const s = getSocket()
  s.auth = { token: getAccessToken() }
  if (!s.connected) s.connect()
  return s
}

export function connectMarketSocket() {
  const s = getMarketSocket()
  if (!s.connected) s.connect()
  return s
}

export function disconnectSocket() {
  if (chatSocket) {
    chatSocket.disconnect()
    chatSocket = null
  }
}

export function disconnectMarketSocket() {
  if (marketSocket) {
    marketSocket.disconnect()
    marketSocket = null
  }
}
