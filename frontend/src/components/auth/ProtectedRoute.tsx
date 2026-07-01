import { Navigate } from "react-router-dom"
import { useEffect } from "react"
import { useAuthStore } from "@/stores/authStore"
import { wsService } from "@/services/websocket"

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  useEffect(() => {
    if (isAuthenticated) {
      // Connect the single shared WebSocket. wsService reads the JWT lazily and
      // refreshes it on expiry, so we must NOT re-run this on every token change
      // — tearing the socket down would orphan listeners other pages (the Claude
      // terminal) registered on it.
      wsService.connect()
    }

    return () => {
      // Only disconnect when actually leaving the authenticated area.
      wsService.disconnect()
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
