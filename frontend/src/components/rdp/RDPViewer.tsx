import { useEffect, useMemo, useRef, useState } from "react"
import { Monitor } from "lucide-react"
import Guacamole from "guacamole-common-js"

interface RDPViewerProps {
  serverId?: string | number
  shouldConnect?: boolean
  guacToken?: string
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: string) => void
  className?: string
}

export function RDPViewer({
  serverId,
  shouldConnect = false,
  guacToken,
  onConnected,
  onDisconnected,
  onError,
  className
}: RDPViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const clientRef = useRef<any>(null)
  const mouseRef = useRef<any>(null)
  const keyboardRef = useRef<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<string>("Disconnected")
  const callbacksRef = useRef({ onConnected, onDisconnected, onError })

  useEffect(() => {
    callbacksRef.current = { onConnected, onDisconnected, onError }
  }, [onConnected, onDisconnected, onError])

    const guacUrl = useMemo(() => {
    if (import.meta.env.VITE_GUAC_URL) return import.meta.env.VITE_GUAC_URL
    if (import.meta.env.VITE_WS_URL) {
      return import.meta.env.VITE_WS_URL.replace(/^http/i, 'ws') + '/guac'
    }
    const host = window.location.hostname
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    return `${protocol}://${host}:9031/guac`
  }, [])

  useEffect(() => {
    if (!serverId || !shouldConnect || !guacToken) return

    const container = containerRef.current
    if (!container) return

    let isMounted = true

    // Clean previous display
    container.innerHTML = ''

    // WebSocketTunnel appends query params passed to client.connect(),
    // so pass the token during connect instead of embedding it in the URL.
    const tunnel = new (Guacamole as any).WebSocketTunnel(guacUrl)
    const client = new (Guacamole as any).Client(tunnel)
    clientRef.current = client
    setConnectionStatus("Connecting...")

    const displayEl = client.getDisplay().getElement()
    displayEl.style.width = '100%'
    displayEl.style.height = '100%'
    displayEl.style.background = '#0a0a0a'
    container.appendChild(displayEl)

    const handleResize = () => {
      const rect = container.getBoundingClientRect()
      client.sendSize(Math.floor(rect.width), Math.floor(rect.height - 40))
    }

    const mouse = new (Guacamole as any).Mouse(displayEl)
    mouse.onmousemove = (state: any) => client.sendMouseState(state)
    mouse.onmousedown = (state: any) => client.sendMouseState(state)
    mouse.onmouseup = (state: any) => client.sendMouseState(state)
    mouseRef.current = mouse

    const keyboard = new (Guacamole as any).Keyboard(displayEl)
    keyboard.onkeydown = (keysym: number) => {
      client.sendKeyEvent(1, keysym)
    }
    keyboard.onkeyup = (keysym: number) => {
      client.sendKeyEvent(0, keysym)
    }
    keyboardRef.current = keyboard

    client.onstatechange = (state: number) => {
      if (!isMounted) return
      switch (state) {
        case (Guacamole as any).Client.State.CONNECTED:
          setIsConnected(true)
          setConnectionStatus("Connected")
          callbacksRef.current.onConnected?.()
          setTimeout(handleResize, 50)
          break
        case (Guacamole as any).Client.State.CONNECTING:
          setConnectionStatus("Connecting...")
          break
        case (Guacamole as any).Client.State.DISCONNECTED:
          setIsConnected(false)
          setConnectionStatus("Disconnected")
          callbacksRef.current.onDisconnected?.()
          break
        default:
          break
      }
    }

    client.onerror = (error: any) => {
      if (!isMounted) return
      setIsConnected(false)
      setConnectionStatus(error?.message || "Error")
      callbacksRef.current.onError?.(error?.message || "Guacamole error")
    }

    window.addEventListener('resize', handleResize)

    client.connect(`token=${encodeURIComponent(guacToken)}`)

    return () => {
      isMounted = false
      window.removeEventListener('resize', handleResize)
      try {
        client.disconnect()
      } catch (err) {
        console.error('Error disconnecting guacamole client', err)
      }
      clientRef.current = null
      mouseRef.current = null
      keyboardRef.current = null
    }
  }, [serverId, shouldConnect, guacToken, guacUrl])

  // If no server connected, show placeholder
  if (!serverId) {
    return (
      <div className={`w-full h-full bg-[#0a0a0a] rounded-lg p-8 flex items-center justify-center ${className || ""}`} style={{ minHeight: "600px" }}>
        <div className="text-center space-y-4">
          <div className="text-6xl opacity-20">🖥️</div>
          <div>
            <p className="text-lg font-medium text-muted-foreground">No server connected</p>
            <p className="text-sm text-muted-foreground/60 mt-2">
              Select a server from the list above to start a remote desktop session
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`w-full h-full bg-[#0a0a0a] rounded-lg ${className || ""}`}
      style={{ minHeight: "600px", position: 'relative' }}
    >
      {/* Status Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-4 py-2 flex items-center justify-between text-xs text-muted-foreground border-t border-white/10">
        <div className="flex items-center gap-2">
          <Monitor className="h-3 w-3 text-primary" />
          <span>Server: {serverId}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          <span>{connectionStatus}</span>
        </div>
      </div>
    </div>
  )
}
