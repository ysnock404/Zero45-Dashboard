import { useEffect, useRef } from "react"
import { Terminal as XTerm } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import "@xterm/xterm/css/xterm.css"
import { wsService } from "@/services/websocket"

interface TerminalProps {
  serverId?: string | number
  shouldConnect?: boolean
  onData?: (data: string) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: string) => void
  className?: string
}

export function Terminal({ serverId, shouldConnect = false, onData, onConnected, onDisconnected, onError, className }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const isConnectingRef = useRef<boolean>(false)
  const connectedServerRef = useRef<string | number | null>(null)
  const callbacksRef = useRef({ onData, onConnected, onDisconnected, onError })

  useEffect(() => {
    callbacksRef.current = { onData, onConnected, onDisconnected, onError }
  }, [onData, onConnected, onDisconnected, onError])

  // Initialize terminal and WebSocket connection
  useEffect(() => {
    if (!terminalRef.current || !serverId || !shouldConnect) return

    let term: XTerm | null = null
    let fitAddon: FitAddon | null = null
    let disposable: any = null
    let isMounted = true

    // Ensure DOM is ready before initializing terminal
    const initTerminal = () => {
      if (!terminalRef.current) return

      // Create terminal instance
      term = new XTerm({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: "#0a0a0a",
          foreground: "#ffffff",
          cursor: "#F0003C",
          cursorAccent: "#0a0a0a",
          selectionBackground: "rgba(240, 0, 60, 0.3)",
          black: "#000000",
          red: "#F0003C",
          green: "#10b981",
          yellow: "#fbbf24",
          blue: "#3b82f6",
          magenta: "#a855f7",
          cyan: "#06b6d4",
          white: "#ffffff",
          brightBlack: "#6b7280",
          brightRed: "#ff4466",
          brightGreen: "#34d399",
          brightYellow: "#fcd34d",
          brightBlue: "#60a5fa",
          brightMagenta: "#c084fc",
          brightCyan: "#22d3ee",
          brightWhite: "#f9fafb",
        },
        rows: 24,
        cols: 80,
        allowProposedApi: true,
      })

      // Create and load addons
      fitAddon = new FitAddon()
      const webLinksAddon = new WebLinksAddon()

      term.loadAddon(fitAddon)
      term.loadAddon(webLinksAddon)

      // Open terminal
      term.open(terminalRef.current)

      // Fit to container after a short delay to ensure DOM is ready
      setTimeout(() => {
        if (fitAddon) {
          fitAddon.fit()
        }
      }, 0)

      // Store refs
      xtermRef.current = term
      fitAddonRef.current = fitAddon

      // Connect WebSocket if not connected
      const socket = wsService.getSocket() || wsService.connect()

      const handleSSHData = (data: string) => {
        if (term) {
          term.write(data)
        }
      }

      const handleSSHError = (error: string) => {
        if (term) {
          term.writeln(`\r\n\x1b[1;31mError: ${error}\x1b[0m\r\n`)
        }
        callbacksRef.current.onError?.(error)
        isConnectingRef.current = false
        connectedServerRef.current = null
      }

      const connectSSH = () => {
        // Prevent duplicate connections
        if (isConnectingRef.current) return
        isConnectingRef.current = true

        // Show connecting message
        if (term) {
          term.writeln("\x1b[1;36mConnecting to server...\x1b[0m")
        }

        console.log('[SSH][Terminal] requesting connect to server', serverId)
        wsService.connectSSH(String(serverId), handleSSHData, handleSSHError)
      }

      // Define handlers for UI updates only (not re-registering in wsService)
      const handleSSHConnected = () => {
        isConnectingRef.current = false
        connectedServerRef.current = serverId
        console.log('[SSH][Terminal] connected event received for', serverId)
        if (term) {
          // Clear the connecting message and show success
          term.write('\r\x1b[K')
          term.writeln('\x1b[1;32m✓ Connected!\x1b[0m')
          term.focus()
        }
        callbacksRef.current.onConnected?.()
      }

      const handleSSHDisconnected = () => {
        console.log('[SSH][Terminal] disconnected event received for', serverId)
        isConnectingRef.current = false
        connectedServerRef.current = null
        if (term) {
          term.writeln('\r\n\x1b[1;33m✗ SSH Disconnected\x1b[0m\r\n')
        }
        callbacksRef.current.onDisconnected?.()
      }

      // Listen for connection status events
      socket.on('ssh:connected', handleSSHConnected)
      socket.on('ssh:disconnected', handleSSHDisconnected)

      // Listen for history (when reconnecting to existing session)
      socket.on('ssh:history', (data: { history: string }) => {
        console.log('[SSH][Terminal] history received length', data.history.length)
        if (term) {
          // Clear connecting message
          term.clear()
          // Write history
          term.write(data.history)
          term.focus()
        }
      })

      // Connect SSH when socket is ready
      if (socket.connected) {
        connectSSH()
      } else {
        socket.once('connect', connectSSH)
      }

      // Handle terminal input
      disposable = term.onData((data) => {
        wsService.sendSSHCommand(data)
        callbacksRef.current.onData?.(data)
      })

      // Handle terminal resize
      const handleResize = () => {
        if (fitAddon && term) {
          fitAddon.fit()
          const { rows, cols } = term
          const socket = wsService.getSocket()
          if (socket) {
            socket.emit('ssh:resize', { rows, cols })
          }
        }
      }

      window.addEventListener("resize", handleResize)

      // Store cleanup function
      return () => {
        isMounted = false
        window.removeEventListener("resize", handleResize)
        if (disposable) {
          disposable.dispose()
        }

        const socket = wsService.getSocket()
        if (socket) {
          socket.off('ssh:connected', handleSSHConnected)
          socket.off('ssh:disconnected', handleSSHDisconnected)
          socket.off('ssh:history')
          socket.off('ssh:data', handleSSHData)
          socket.off('ssh:error', handleSSHError)
        }

        if (term) {
          term.dispose()
          xtermRef.current = null
          fitAddonRef.current = null
        }

        isConnectingRef.current = false
        connectedServerRef.current = null
      }
    }

    // Use requestAnimationFrame to ensure DOM is ready
    const rafId = requestAnimationFrame(() => {
      if (!isMounted) return
      const cleanup = initTerminal()
      // Store cleanup for useEffect cleanup
      if (cleanup) {
        cleanupRef = cleanup
      }
    })

    let cleanupRef: (() => void) | undefined

    // Cleanup
    return () => {
      isMounted = false
      cancelAnimationFrame(rafId)
      if (cleanupRef) {
        cleanupRef()
      }
    }
  }, [serverId, shouldConnect])

  // If no server connected, show placeholder
  if (!serverId) {
    return (
      <div className={`w-full h-full bg-[#0a0a0a] rounded-lg p-8 flex items-center justify-center ${className || ""}`} style={{ minHeight: "400px" }}>
        <div className="text-center space-y-4">
          <div className="text-6xl opacity-20">💻</div>
          <div>
            <p className="text-lg font-medium text-muted-foreground">No server connected</p>
            <p className="text-sm text-muted-foreground/60 mt-2">
              Select a server from the list above to start a terminal session
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={terminalRef}
      className={`w-full h-full bg-[#0a0a0a] rounded-lg p-4 ${className || ""}`}
      style={{ minHeight: "400px" }}
    />
  )
}
