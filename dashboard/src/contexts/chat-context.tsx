import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { Socket } from "socket.io-client"
import { connectSocket, disconnectSocket } from "@/lib/socket"
import { api, getAccessToken } from "@/lib/api"
import { useAuth } from "./auth-context"

// ── Types ──

export interface ChatUser {
  id: string
  email: string
  fullName: string | null
  role: string
}

export interface ChatRoom {
  id: string
  name: string | null
  description: string | null
  type: "DIRECT" | "GROUP" | "PUBLIC"
  avatar: string | null
  createdById: string
  members: { id: string; userId: string; role: string; user: ChatUser }[]
  messages?: ChatMessage[]
  _count: { messages: number; members: number }
  unreadCount?: number
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  roomId: string
  senderId: string
  content: string | null
  type: "TEXT" | "IMAGE" | "FILE" | "SYSTEM"
  fileUrl: string | null
  fileName: string | null
  fileSize: number | null
  replyToId: string | null
  isEdited: boolean
  isDeleted: boolean
  createdAt: string
  sender: ChatUser
  replyTo?: {
    id: string
    content: string | null
    sender: ChatUser
  } | null
  reactions: {
    id: string
    emoji: string
    userId: string
    user: ChatUser
  }[]
}

interface ChatContextValue {
  // Panel state
  isOpen: boolean
  setIsOpen: (open: boolean) => void

  // Rooms
  rooms: ChatRoom[]
  publicRooms: ChatRoom[]
  currentRoom: ChatRoom | null
  setCurrentRoom: (room: ChatRoom | null) => void
  createRoom: (name: string, type: "GROUP" | "PUBLIC") => Promise<void>
  loadRooms: () => Promise<void>
  loadPublicRooms: () => Promise<void>
  joinRoom: (roomId: string) => Promise<void>

  // Messages
  messages: ChatMessage[]
  sendMessage: (content: string, replyToId?: string) => void
  loadMessages: (roomId: string) => Promise<void>

  // Socket state
  isConnected: boolean
  onlineUsers: string[]
  typingUsers: Map<string, string>
  sendTyping: (roomId: string) => void
  sendStopTyping: (roomId: string) => void
  markRead: (roomId: string) => void

  // Reactions
  addReaction: (messageId: string, emoji: string) => void
  removeReaction: (messageId: string, emoji: string) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error("useChat must be used within ChatProvider")
  return ctx
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()

  const [isOpen, setIsOpen] = useState(false)
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [publicRooms, setPublicRooms] = useState<ChatRoom[]>([])
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map())

  const socketRef = useRef<Socket | null>(null)
  const typingTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const currentRoomRef = useRef<string | null>(null)

  // Keep currentRoom ref in sync
  useEffect(() => {
    currentRoomRef.current = currentRoom?.id || null
  }, [currentRoom])

  // ── Socket connection ──

  useEffect(() => {
    if (!isAuthenticated || !getAccessToken()) return

    const socket = connectSocket()
    socketRef.current = socket

    socket.on("connect", () => {
      setIsConnected(true)
      // Request online users list after connecting
      socket.emit("get_online_users")
    })
    socket.on("disconnect", () => setIsConnected(false))

    socket.on("new_message", (message: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev
        return [...prev, message]
      })
      // Update room's last message & unread count
      setRooms((prev) =>
        prev.map((r) =>
          r.id === message.roomId
            ? { ...r, messages: [message], unreadCount: (r.unreadCount || 0) + 1 }
            : r,
        ),
      )
    })

    // Notification for messages (arrives even when not in the room)
    socket.on("notification", (data: { type: string; roomId: string; message: ChatMessage }) => {
      if (data.type === "new_message" && data.message) {
        const senderName = data.message.sender?.fullName || data.message.sender?.email || "Ai đó"
        const content = data.message.content?.slice(0, 60) || "📎 File"

        // Only show toast if the panel is not focused on that room
        if (currentRoomRef.current !== data.roomId) {
          // Fire custom event for toast (handled by component)
          window.dispatchEvent(
            new CustomEvent("chat:notification", {
              detail: { senderName, content, roomId: data.roomId },
            }),
          )
        }

        // Update room unread in sidebar
        setRooms((prev) =>
          prev.map((r) =>
            r.id === data.roomId
              ? { ...r, messages: [data.message], unreadCount: (r.unreadCount || 0) + 1 }
              : r,
          ),
        )
      }
    })

    socket.on("message_edited", (updated: ChatMessage) => {
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
    })

    socket.on("message_deleted", (data: { id: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.id ? { ...m, isDeleted: true, content: null } : m,
        ),
      )
    })

    socket.on("typing", (data: { userId: string; roomId: string }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev)
        next.set(data.userId, data.roomId)
        return next
      })
      // Auto clear after 3s
      const existing = typingTimerRef.current.get(data.userId)
      if (existing) clearTimeout(existing)
      typingTimerRef.current.set(
        data.userId,
        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Map(prev)
            next.delete(data.userId)
            return next
          })
        }, 3000),
      )
    })

    socket.on("stop_typing", (data: { userId: string }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev)
        next.delete(data.userId)
        return next
      })
    })

    socket.on("reaction_added", (reaction: { messageId: string; emoji: string; userId: string; user: ChatUser }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === reaction.messageId
            ? { ...m, reactions: [...m.reactions.filter((r) => !(r.userId === reaction.userId && r.emoji === reaction.emoji)), reaction as any] }
            : m,
        ),
      )
    })

    socket.on("reaction_removed", (data: { messageId: string; userId: string; emoji: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? { ...m, reactions: m.reactions.filter((r) => !(r.userId === data.userId && r.emoji === data.emoji)) }
            : m,
        ),
      )
    })

    socket.on("user_online", (data: { userId: string }) => {
      setOnlineUsers((prev) =>
        prev.includes(data.userId) ? prev : [...prev, data.userId],
      )
    })

    socket.on("user_offline", (data: { userId: string }) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== data.userId))
    })

    socket.on("online_users", (data: { data: string[] }) => {
      setOnlineUsers(data.data || [])
    })

    return () => {
      socket.removeAllListeners()
      disconnectSocket()
      socketRef.current = null
    }
  }, [isAuthenticated])

  // ── API calls ──

  const loadRooms = useCallback(async () => {
    if (!getAccessToken()) return
    try {
      const res = await api.get("chat/rooms", { searchParams: { limit: 50 } }).json<{
        data: ChatRoom[]
      }>()
      setRooms(res.data)
    } catch {
      // silently fail
    }
  }, [])

  const loadMessages = useCallback(async (roomId: string) => {
    if (!getAccessToken()) return
    try {
      const res = await api
        .get(`chat/rooms/${roomId}/messages`, { searchParams: { limit: 50 } })
        .json<{ data: ChatMessage[] }>()
      setMessages(res.data)

      // Join socket room
      socketRef.current?.emit("join_room", { roomId })
      socketRef.current?.emit("mark_read", { roomId })

      // Clear unread
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, unreadCount: 0 } : r)),
      )
    } catch {
      // silently fail
    }
  }, [])

  const createRoom = useCallback(async (name: string, type: "GROUP" | "PUBLIC") => {
    if (!getAccessToken()) return
    const res = await api
      .post("chat/rooms", { json: { name, type } })
      .json<{ data: ChatRoom }>()
    setRooms((prev) => [res.data, ...prev])
    setCurrentRoom(res.data)
  }, [])

  const loadPublicRooms = useCallback(async () => {
    if (!getAccessToken()) return
    try {
      const res = await api
        .get("chat/rooms/public", { searchParams: { limit: 50 } })
        .json<{ data: ChatRoom[] }>()
      setPublicRooms(res.data)
    } catch {
      // silently fail
    }
  }, [])

  const joinRoom = useCallback(async (roomId: string) => {
    if (!getAccessToken()) return
    await api.post(`chat/rooms/${roomId}/join`).json()
    // Reload rooms to include the newly joined room
    await loadRooms()
    // Remove from public rooms discover list
    setPublicRooms((prev) => prev.filter((r) => r.id !== roomId))
    // Set as current room
    const joined = rooms.find((r) => r.id === roomId)
    if (joined) setCurrentRoom(joined)
  }, [loadRooms, rooms])

  // ── Socket emits ──

  const sendMessage = useCallback(
    (content: string, replyToId?: string) => {
      if (!currentRoom || !socketRef.current) return
      socketRef.current.emit("send_message", {
        roomId: currentRoom.id,
        content,
        replyToId,
      })
      socketRef.current.emit("stop_typing", { roomId: currentRoom.id })
    },
    [currentRoom],
  )

  const sendTyping = useCallback((roomId: string) => {
    socketRef.current?.emit("typing", { roomId })
  }, [])

  const sendStopTyping = useCallback((roomId: string) => {
    socketRef.current?.emit("stop_typing", { roomId })
  }, [])

  const markRead = useCallback((roomId: string) => {
    socketRef.current?.emit("mark_read", { roomId })
  }, [])

  const addReaction = useCallback((messageId: string, emoji: string) => {
    socketRef.current?.emit("add_reaction", { messageId, emoji })
  }, [])

  const removeReaction = useCallback((messageId: string, emoji: string) => {
    socketRef.current?.emit("remove_reaction", { messageId, emoji })
  }, [])

  // ── Load rooms on auth (for unread badge) + refresh on open ──

  useEffect(() => {
    if (isAuthenticated) {
      loadRooms()
    }
  }, [isAuthenticated, loadRooms])

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadRooms()
    }
  }, [isOpen, isAuthenticated, loadRooms])

  // ── Leave room on switch ──

  const prevRoomRef = useRef<string | null>(null)
  useEffect(() => {
    if (prevRoomRef.current && prevRoomRef.current !== currentRoom?.id) {
      socketRef.current?.emit("leave_room", { roomId: prevRoomRef.current })
    }
    prevRoomRef.current = currentRoom?.id || null

    if (currentRoom) {
      loadMessages(currentRoom.id)
    }
  }, [currentRoom, loadMessages])

  const value = useMemo<ChatContextValue>(
    () => ({
      isOpen,
      setIsOpen,
      rooms,
      publicRooms,
      currentRoom,
      setCurrentRoom,
      createRoom,
      loadRooms,
      loadPublicRooms,
      joinRoom,
      messages,
      sendMessage,
      loadMessages,
      isConnected,
      onlineUsers,
      typingUsers,
      sendTyping,
      sendStopTyping,
      markRead,
      addReaction,
      removeReaction,
    }),
    [
      isOpen, rooms, publicRooms, currentRoom, messages, isConnected,
      onlineUsers, typingUsers, sendMessage, loadRooms,
      loadMessages, createRoom, loadPublicRooms, joinRoom,
      sendTyping, sendStopTyping, markRead, addReaction, removeReaction,
    ],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
