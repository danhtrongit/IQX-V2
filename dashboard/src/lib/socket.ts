import { io, type Socket } from "socket.io-client"
import { getAccessToken } from "./api"

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001"

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${SOCKET_URL}/chat`, {
      auth: { token: getAccessToken() },
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    })
  }
  return socket
}

export function connectSocket() {
  const s = getSocket()
  s.auth = { token: getAccessToken() }
  if (!s.connected) s.connect()
  return s
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
