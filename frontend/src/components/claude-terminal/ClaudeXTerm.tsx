import { useEffect, useRef } from "react"
import { Terminal as XTerm } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import "@xterm/xterm/css/xterm.css"
import { wsService } from "@/services/websocket"

interface ClaudeXTermProps {
  onConnected?: () => void
  onError?: (error: string) => void
  className?: string
}

export function ClaudeXTerm({ onConnected, onError, className }: ClaudeXTermProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const callbacksRef = useRef({ onConnected, onError })

  useEffect(() => {
    callbacksRef.current = { onConnected, onError }
  }, [onConnected, onError])

  useEffect(() => {
    if (!terminalRef.current) return

    let term: XTerm | null = null
    let fitAddon: FitAddon | null = null
    let disposable: any = null
    let isMounted = true

    const initTerminal = () => {
      if (!terminalRef.current) return

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
        rows: 30,
        cols: 100,
        allowProposedApi: true,
      })

      fitAddon = new FitAddon()
      const webLinksAddon = new WebLinksAddon()

      term.loadAddon(fitAddon)
      term.loadAddon(webLinksAddon)
      term.open(terminalRef.current)
      term.write('\x1b[38;5;246mA iniciar sessão Claude Code (pode demorar 10-15s na primeira vez)...\x1b[0m')

      setTimeout(() => {
        fitAddon?.fit()
      }, 0)

      let placeholderCleared = false
      const handleData = (data: string) => {
        if (!placeholderCleared) {
          placeholderCleared = true
          term?.clear()
        }
        term?.write(data)
      }

      const handleError = (error: string) => {
        term?.writeln(`\r\n\x1b[1;31mErro: ${error}\x1b[0m\r\n`)
        callbacksRef.current.onError?.(error)
      }

      const handleConnected = () => {
        term?.focus()
        callbacksRef.current.onConnected?.()
      }

      const handleHistory = (data: { history: string }) => {
        placeholderCleared = true
        term?.clear()
        term?.write(data.history)
        term?.focus()
      }

      const handleExited = () => {
        term?.writeln('\r\n\x1b[1;33m✗ Sessão terminada\x1b[0m\r\n')
      }

      // Never create our own socket here — only ever attach to the single
      // authenticated connection ProtectedRoute owns. Creating a second one
      // from this component raced ProtectedRoute's connect() and could leave
      // this component's listeners on a different socket than the one that
      // actually emitted claude:connect.
      let boundSocket: ReturnType<typeof wsService.getSocket> = null
      let pollHandle: ReturnType<typeof setInterval> | null = null

      const requestSession = () => wsService.connectClaudeTerminal(handleData, handleError)

      const attach = (socket: NonNullable<ReturnType<typeof wsService.getSocket>>) => {
        boundSocket = socket
        socket.on('claude:connected', handleConnected)
        socket.on('claude:history', handleHistory)
        socket.on('claude:exited', handleExited)

        // Re-request the session on every (re)connection — after a token
        // refresh the socket reconnects with a new id, so we must re-attach to
        // the backend session (which replays history) rather than sit idle.
        socket.on('connect', requestSession)
        if (socket.connected) {
          requestSession()
        }
      }

      const existing = wsService.getSocket()
      if (existing) {
        attach(existing)
      } else {
        // ProtectedRoute owns the socket; if it isn't up yet (e.g. hard refresh
        // straight onto /assistant), make sure it gets created, then attach.
        wsService.connect()
        pollHandle = setInterval(() => {
          const socket = wsService.getSocket()
          if (socket) {
            if (pollHandle) clearInterval(pollHandle)
            attach(socket)
          }
        }, 150)
      }

      disposable = term.onData((data) => {
        wsService.sendClaudeInput(data)
      })

      const handleResize = () => {
        if (fitAddon && term) {
          fitAddon.fit()
          wsService.resizeClaudeTerminal(term.cols, term.rows)
        }
      }

      window.addEventListener("resize", handleResize)

      return () => {
        isMounted = false
        window.removeEventListener("resize", handleResize)
        if (pollHandle) clearInterval(pollHandle)
        disposable?.dispose()

        if (boundSocket) {
          boundSocket.off('claude:data', handleData)
          boundSocket.off('claude:error', handleError)
          boundSocket.off('claude:connected', handleConnected)
          boundSocket.off('claude:history', handleHistory)
          boundSocket.off('claude:exited', handleExited)
          boundSocket.off('connect', requestSession)
        }

        term?.dispose()
      }
    }

    const rafId = requestAnimationFrame(() => {
      if (!isMounted) return
      const cleanup = initTerminal()
      if (cleanup) {
        cleanupRef = cleanup
      }
    })

    let cleanupRef: (() => void) | undefined

    return () => {
      isMounted = false
      cancelAnimationFrame(rafId)
      cleanupRef?.()
    }
  }, [])

  return (
    <div
      ref={terminalRef}
      className={`w-full h-full bg-[#0a0a0a] rounded-lg p-4 ${className || ""}`}
      style={{ minHeight: "500px" }}
    />
  )
}
