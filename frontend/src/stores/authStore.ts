import { create } from "zustand"
import { persist } from "zustand/middleware"

interface User {
  email: string
  name: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  checkAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        // Simulação de API call (substituir por chamada real)
        return new Promise((resolve) => {
          setTimeout(() => {
            if (email === "admin@ysnockserver.local" && password === "admin") {
              const user = {
                email: email,
                name: "Admin User",
              }
              const token = "fake-jwt-token"

              set({
                user,
                token,
                isAuthenticated: true,
              })
              resolve(true)
            } else {
              resolve(false)
            }
          }, 1000)
        })
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },

      checkAuth: () => {
        const isAuth = localStorage.getItem("isAuthenticated") === "true"
        if (!isAuth) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          })
        }
      },
    }),
    {
      name: "auth-storage",
    }
  )
)
