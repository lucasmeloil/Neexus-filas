"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export type ServiceType = "normal" | "pregnant" | "elderly"

interface QueueItem {
  id: string
  number: string
  timestamp: Date
  status: "waiting" | "called" | "serving" | "completed"
  attendant?: number
  serviceType: ServiceType
  displayNumber: string
  calledAt?: Date
  completedAt?: Date
  serviceTime?: number
}

interface CalledTicket {
  number: string
  displayNumber: string
  attendant: number
  timestamp: Date
  serviceType: ServiceType
}

interface NetworkQueueStore {
  // Estados locais
  queue: QueueItem[]
  currentNumbers: { [key: number]: string | null }
  attendantStatus: { [key: number]: "available" | "busy" }
  nextNumbers: { [key in ServiceType]: number }
  calledTickets: CalledTicket[]
  currentCalled: CalledTicket | null
  lastCalledByAttendant: { [key: number]: CalledTicket | null }

  // Configuração de rede
  serverUrl: string
  isServer: boolean
  isConnected: boolean

  // Métodos
  generateTicket: (serviceType: ServiceType) => QueueItem
  callNext: (attendantId: number) => void
  callAgain: (attendantId: number) => void
  completeService: (attendantId: number) => void
  getWaitingCount: () => number
  getWaitingCountByType: (type: ServiceType) => number
  getServedToday: () => number
  getPriorityQueue: () => QueueItem[]
  getCompletedWithTime: () => QueueItem[]
  clearCurrentCalled: () => void

  // Métodos de rede
  setServerUrl: (url: string) => void
  setIsServer: (isServer: boolean) => void
  connectToServer: () => void
  broadcastUpdate: (action: string, data: any) => void
  syncFromServer: (data: any) => void
}

// Configuração do servidor WebSocket (simulado com polling)
let syncInterval: NodeJS.Timeout | null = null

const getServicePrefix = (type: ServiceType): string => {
  switch (type) {
    case "pregnant":
      return "G"
    case "elderly":
      return "I"
    case "normal":
      return "N"
    default:
      return "N"
  }
}

const getServicePriority = (type: ServiceType): number => {
  switch (type) {
    case "pregnant":
      return 1
    case "elderly":
      return 2
    case "normal":
      return 3
    default:
      return 3
  }
}

export const useNetworkQueueStore = create<NetworkQueueStore>()(
  persist(
    (set, get) => ({
      // Estados iniciais
      queue: [],
      currentNumbers: { 1: null, 2: null, 3: null },
      attendantStatus: { 1: "available", 2: "available", 3: "available" },
      nextNumbers: { normal: 1, pregnant: 1, elderly: 1 },
      calledTickets: [],
      currentCalled: null,
      lastCalledByAttendant: { 1: null, 2: null, 3: null },

      // Configuração de rede
      serverUrl: "http://192.168.0.102:3000",
      isServer: false,
      isConnected: false,

      setServerUrl: (url: string) => {
        set({ serverUrl: url })
      },

      setIsServer: (isServer: boolean) => {
        set({ isServer })
      },

      connectToServer: () => {
        const { serverUrl, isServer } = get()

        if (isServer) {
          // Se é servidor, não precisa conectar
          set({ isConnected: true })
          return
        }

        // Configurar polling para sincronização
        if (syncInterval) {
          clearInterval(syncInterval)
        }

        syncInterval = setInterval(async () => {
          try {
            const response = await fetch(`${serverUrl}/api/queue-sync`)
            if (response.ok) {
              const data = await response.json()
              get().syncFromServer(data)
              set({ isConnected: true })
            } else {
              set({ isConnected: false })
            }
          } catch (error) {
            console.error("Erro na sincronização:", error)
            set({ isConnected: false })
          }
        }, 2000) // Sincronizar a cada 2 segundos
      },

      broadcastUpdate: async (action: string, data: any) => {
        const { serverUrl, isServer } = get()

        if (!isServer) return // Apenas o servidor pode fazer broadcast

        try {
          await fetch(`${serverUrl}/api/queue-sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ action, data }),
          })
        } catch (error) {
          console.error("Erro no broadcast:", error)
        }
      },

      syncFromServer: (data: any) => {
        // Converter timestamps de volta para Date objects
        if (data.queue) {
          data.queue = data.queue.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp),
            calledAt: item.calledAt ? new Date(item.calledAt) : undefined,
            completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
          }))
        }
        if (data.calledTickets) {
          data.calledTickets = data.calledTickets.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp),
          }))
        }
        if (data.currentCalled) {
          data.currentCalled = {
            ...data.currentCalled,
            timestamp: new Date(data.currentCalled.timestamp),
          }
        }
        if (data.lastCalledByAttendant) {
          Object.keys(data.lastCalledByAttendant).forEach((key) => {
            const attendantId = Number.parseInt(key)
            if (data.lastCalledByAttendant[attendantId]) {
              data.lastCalledByAttendant[attendantId] = {
                ...data.lastCalledByAttendant[attendantId],
                timestamp: new Date(data.lastCalledByAttendant[attendantId].timestamp),
              }
            }
          })
        }

        set((state) => ({
          ...state,
          ...data,
        }))

        // Tocar som quando uma senha for chamada
        if (data.currentCalled) {
          playCallSoundTwice()
        }
      },

      generateTicket: (serviceType: ServiceType) => {
        const state = get()
        const prefix = getServicePrefix(serviceType)
        const number = state.nextNumbers[serviceType]
        const displayNumber = `${prefix}${number.toString().padStart(3, "0")}`

        const newTicket: QueueItem = {
          id: Date.now().toString(),
          number: number.toString().padStart(3, "0"),
          displayNumber,
          timestamp: new Date(),
          status: "waiting",
          serviceType,
        }

        const newState = {
          queue: [...state.queue, newTicket],
          nextNumbers: { ...state.nextNumbers, [serviceType]: number + 1 },
        }

        set(newState)

        // Broadcast para outros clientes
        if (state.isServer) {
          get().broadcastUpdate("GENERATE_TICKET", newState)
        }

        return newTicket
      },

      callNext: (attendantId: number) => {
        const state = get()

        const waitingCustomers = state.queue
          .filter((item) => item.status === "waiting")
          .sort((a, b) => {
            const priorityDiff = getServicePriority(a.serviceType) - getServicePriority(b.serviceType)
            if (priorityDiff !== 0) return priorityDiff
            return a.timestamp.getTime() - b.timestamp.getTime()
          })

        if (waitingCustomers.length === 0) return

        const nextCustomer = waitingCustomers[0]
        const calledAt = new Date()

        const calledTicket: CalledTicket = {
          number: nextCustomer.number,
          displayNumber: nextCustomer.displayNumber,
          attendant: attendantId,
          timestamp: calledAt,
          serviceType: nextCustomer.serviceType,
        }

        const newState = {
          queue: state.queue.map((item) =>
            item.id === nextCustomer.id
              ? { ...item, status: "called" as const, attendant: attendantId, calledAt }
              : item,
          ),
          currentNumbers: { ...state.currentNumbers, [attendantId]: nextCustomer.displayNumber },
          attendantStatus: { ...state.attendantStatus, [attendantId]: "busy" as const },
          calledTickets: [...state.calledTickets, calledTicket],
          currentCalled: calledTicket,
          lastCalledByAttendant: { ...state.lastCalledByAttendant, [attendantId]: calledTicket },
        }

        set(newState)

        // Broadcast para outros clientes
        if (state.isServer) {
          get().broadcastUpdate("CALL_NEXT", newState)
        }
      },

      callAgain: (attendantId: number) => {
        const state = get()
        const lastCalled = state.lastCalledByAttendant[attendantId]

        if (!lastCalled) return

        const calledTicket: CalledTicket = {
          ...lastCalled,
          timestamp: new Date(),
        }

        const newState = {
          calledTickets: [...state.calledTickets, calledTicket],
          currentCalled: calledTicket,
        }

        set(newState)

        // Broadcast para outros clientes
        if (state.isServer) {
          get().broadcastUpdate("CALL_AGAIN", newState)
        }
      },

      completeService: (attendantId: number) => {
        const state = get()
        const currentNumber = state.currentNumbers[attendantId]

        if (!currentNumber) return

        const completedAt = new Date()
        const queueItem = state.queue.find(
          (item) => item.displayNumber === currentNumber && item.attendant === attendantId,
        )

        let serviceTime = 0
        if (queueItem && queueItem.calledAt) {
          serviceTime = Math.round((completedAt.getTime() - queueItem.calledAt.getTime()) / (1000 * 60))
        }

        const newState = {
          queue: state.queue.map((item) =>
            item.displayNumber === currentNumber && item.attendant === attendantId
              ? { ...item, status: "completed" as const, completedAt, serviceTime }
              : item,
          ),
          currentNumbers: { ...state.currentNumbers, [attendantId]: null },
          attendantStatus: { ...state.attendantStatus, [attendantId]: "available" as const },
          lastCalledByAttendant: { ...state.lastCalledByAttendant, [attendantId]: null },
        }

        set(newState)

        // Broadcast para outros clientes
        if (state.isServer) {
          get().broadcastUpdate("COMPLETE_SERVICE", newState)
        }
      },

      getWaitingCount: () => {
        return get().queue.filter((item) => item.status === "waiting").length
      },

      getWaitingCountByType: (type: ServiceType) => {
        return get().queue.filter((item) => item.status === "waiting" && item.serviceType === type).length
      },

      getServedToday: () => {
        return get().queue.filter((item) => item.status === "completed").length
      },

      getPriorityQueue: () => {
        return get()
          .queue.filter((item) => item.status === "waiting")
          .sort((a, b) => {
            const priorityDiff = getServicePriority(a.serviceType) - getServicePriority(b.serviceType)
            if (priorityDiff !== 0) return priorityDiff
            return a.timestamp.getTime() - b.timestamp.getTime()
          })
      },

      getCompletedWithTime: () => {
        return get()
          .queue.filter((item) => item.status === "completed" && item.serviceTime !== undefined)
          .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))
      },

      clearCurrentCalled: () => {
        set((state) => ({
          ...state,
          currentCalled: null,
        }))
      },
    }),
    {
      name: "network-queue-storage",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Converter timestamps de volta para Date objects
          state.queue = state.queue.map((item) => ({
            ...item,
            timestamp: new Date(item.timestamp),
            calledAt: item.calledAt ? new Date(item.calledAt) : undefined,
            completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
          }))
          state.calledTickets =
            state.calledTickets?.map((item) => ({
              ...item,
              timestamp: new Date(item.timestamp),
            })) || []
          if (state.lastCalledByAttendant) {
            Object.keys(state.lastCalledByAttendant).forEach((key) => {
              const attendantId = Number.parseInt(key)
              if (state.lastCalledByAttendant[attendantId]) {
                state.lastCalledByAttendant[attendantId] = {
                  ...state.lastCalledByAttendant[attendantId],
                  timestamp: new Date(state.lastCalledByAttendant[attendantId]!.timestamp),
                }
              }
            })
          }

          // Conectar ao servidor após rehydrate
          setTimeout(() => {
            state.connectToServer()
          }, 1000)
        }
      },
    },
  ),
)

// Função para tocar som 2 vezes
const playCallSoundTwice = () => {
  if (typeof window !== "undefined") {
    playCallSound()
    setTimeout(() => {
      playCallSound()
    }, 1500)
  }
}

// Função para tocar som de chamada
const playCallSound = () => {
  if (typeof window !== "undefined") {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

    const oscillator1 = audioContext.createOscillator()
    const gainNode1 = audioContext.createGain()

    oscillator1.connect(gainNode1)
    gainNode1.connect(audioContext.destination)

    oscillator1.frequency.setValueAtTime(800, audioContext.currentTime)
    gainNode1.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    oscillator1.start(audioContext.currentTime)
    oscillator1.stop(audioContext.currentTime + 0.5)

    setTimeout(() => {
      const oscillator2 = audioContext.createOscillator()
      const gainNode2 = audioContext.createGain()

      oscillator2.connect(gainNode2)
      gainNode2.connect(audioContext.destination)

      oscillator2.frequency.setValueAtTime(600, audioContext.currentTime)
      gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

      oscillator2.start(audioContext.currentTime)
      oscillator2.stop(audioContext.currentTime + 0.5)
    }, 600)
  }
}
