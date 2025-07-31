"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export interface User {
  id: string
  username: string
  name: string
  role: "admin" | "operator"
  lastLogin?: Date
  loginCount: number
}

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  users: User[]
  loginHistory: Array<{
    userId: string
    username: string
    timestamp: Date
    success: boolean
    ip?: string
  }>

  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  getCurrentUser: () => User | null
  getLoginHistory: () => Array<{
    userId: string
    username: string
    timestamp: Date
    success: boolean
    ip?: string
  }>
}

// Usuários pré-definidos
const defaultUsers: User[] = [
  {
    id: "1",
    username: "lucasmelo",
    name: "Lucas Melo",
    role: "admin",
    loginCount: 0,
  },
  {
    id: "2",
    username: "carla",
    name: "Carla",
    role: "admin",
    loginCount: 0,
  },
  {
    id: "3",
    username: "carlos",
    name: "Carlos",
    role: "admin",
    loginCount: 0,
  },
]

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      users: defaultUsers,
      loginHistory: [],

      login: async (username: string, password: string) => {
        // Simular delay de autenticação
        await new Promise((resolve) => setTimeout(resolve, 500))

        const users = get().users
        const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase())

        const loginAttempt = {
          userId: user?.id || "unknown",
          username,
          timestamp: new Date(),
          success: false,
          ip: "127.0.0.1", // Em produção, pegar IP real
        }

        // Verificar credenciais (senha fixa: admin123)
        if (user && password === "admin123") {
          const updatedUser = {
            ...user,
            lastLogin: new Date(),
            loginCount: user.loginCount + 1,
          }

          loginAttempt.success = true

          set((state) => ({
            user: updatedUser,
            isAuthenticated: true,
            users: state.users.map((u) => (u.id === user.id ? updatedUser : u)),
            loginHistory: [loginAttempt, ...state.loginHistory.slice(0, 49)], // Manter últimos 50
          }))

          return true
        }

        // Login falhou
        set((state) => ({
          loginHistory: [loginAttempt, ...state.loginHistory.slice(0, 49)],
        }))

        return false
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
        })
      },

      getCurrentUser: () => {
        return get().user
      },

      getLoginHistory: () => {
        return get().loginHistory
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Converter timestamps de volta para Date objects
          if (state.user?.lastLogin) {
            state.user.lastLogin = new Date(state.user.lastLogin)
          }
          state.loginHistory =
            state.loginHistory?.map((item) => ({
              ...item,
              timestamp: new Date(item.timestamp),
            })) || []
        }
      },
    },
  ),
)
