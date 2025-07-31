"use client"

import { create } from "zustand"

interface WebSocketStore {
  socket: WebSocket | null
  isConnected: boolean
  connect: (url: string) => void
  disconnect: () => void
  sendMessage: (message: any) => void
  onMessage: (callback: (data: any) => void) => void
}

export const useWebSocketStore = create<WebSocketStore>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: (url: string) => {
    const socket = new WebSocket(url)

    socket.onopen = () => {
      console.log("🔗 WebSocket conectado")
      set({ socket, isConnected: true })
    }

    socket.onclose = () => {
      console.log("❌ WebSocket desconectado")
      set({ socket: null, isConnected: false })

      // Tentar reconectar após 3 segundos
      setTimeout(() => {
        get().connect(url)
      }, 3000)
    }

    socket.onerror = (error) => {
      console.error("🚨 Erro WebSocket:", error)
    }

    set({ socket })
  },

  disconnect: () => {
    const { socket } = get()
    if (socket) {
      socket.close()
      set({ socket: null, isConnected: false })
    }
  },

  sendMessage: (message: any) => {
    const { socket, isConnected } = get()
    if (socket && isConnected) {
      socket.send(JSON.stringify(message))
    }
  },

  onMessage: (callback: (data: any) => void) => {
    const { socket } = get()
    if (socket) {
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          callback(data)
        } catch (error) {
          console.error("Erro ao processar mensagem:", error)
        }
      }
    }
  },
}))
