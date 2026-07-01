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

      setTimeout(() => {
        fitAddon?.fit()
      }, 0)

      const socket = wsService.getSocket() || wsService.connect()

      const handleData = (data: string) => {
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

      const connect = () => {
        wsService.connectClaudeTerminal(handleData, handleError)
      }

      socket.on('claude:connected', handleConnected)
      socket.on('claude:history', (data: { history: string }) => {
        term?.clear()
        term?.write(data.history)
        term?.focus()
      })
      socket.on('claude:exited', () => {
        term?.writeln('\r\n\x1b[1;33m✗ Sessão terminada\x1b[0m\r\n')
      })

      if (socket.connected) {
        connect()
      } else {
        socket.once('connect', connect)
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
        disposable?.dispose()

        const socket = wsService.getSocket()
        if (socket) {
          socket.off('claude:data', handleData)
          socket.off('claude:error', handleError)
          socket.off('claude:connected', handleConnected)
          socket.off('claude:history')
          socket.off('claude:exited')
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
