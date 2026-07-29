import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Server, Plus, Terminal as TerminalIcon, Globe, HardDrive, Activity, Trash2, Edit, Maximize2, X, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Terminal } from "@/components/ssh/Terminal"
import { sshApi } from "@/services/api"
import { wsService } from "@/services/websocket"

interface SSHServer {
  id: string
  name: string
  host: string
  port: number
  username: string
  status: "online" | "offline" | "connecting" | "connected"
  lastConnected?: string
  tags?: string[]
}

export default function SSH() {
  const { toast } = useToast()
  const [connectedServer, setConnectedServer] = useState<SSHServer | null>(null)
  const connectedServerRef = useRef<SSHServer | null>(null)
  const [shouldConnect, setShouldConnect] = useState(false)
  const [connectingServerId, setConnectingServerId] = useState<string | null>(null)
  const connectingServerIdRef = useRef<string | null>(null)
  const [isTerminalFullscreen, setIsTerminalFullscreen] = useState(false)
  const [servers, setServers] = useState<SSHServer[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const terminalCardRef = useRef<HTMLDivElement>(null)
  const scrollToTerminal = useCallback(() => {
    terminalCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  useEffect(() => {
    connectingServerIdRef.current = connectingServerId
  }, [connectingServerId])

  const refreshServers = useCallback(async (options?: { silent?: boolean }) => {
    try {
      const [data, activeSessions] = await Promise.all([
        sshApi.getServers(),
        sshApi.getActiveSessions().catch(() => [] as string[]),
      ])

      const testResults = await Promise.allSettled(
        data.map(async (server: SSHServer) => {
          const result = await sshApi.testConnection(server.id)
          return { serverId: server.id, online: result.success }
        })
      )

      const resultsMap = new Map<string, boolean>()
      testResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          resultsMap.set(result.value.serverId, result.value.online)
        }
      })

      const activeSessionSet = new Set(activeSessions)
      const currentConnectedId = connectedServerRef.current?.id
      if (currentConnectedId) {
        activeSessionSet.add(currentConnectedId)
      }

      const updatedServers = data.map((server) => {
        const isActive = activeSessionSet.has(server.id)
        const isConnecting = connectingServerIdRef.current === server.id
        const isOnline = resultsMap.get(server.id) ?? false

        let status: SSHServer['status'] = 'offline'
        if (isActive) {
          status = 'connected'
        } else if (isConnecting) {
          status = 'connecting'
        } else if (isOnline) {
          status = 'online'
        }

        return { ...server, status }
      })

      setServers(updatedServers)

      if (activeSessions.length > 0) {
        const activeServerId = activeSessions[0]
        const alreadySet = connectedServerRef.current?.id === activeServerId
        const activeServer = updatedServers.find((s) => s.id === activeServerId)

        if (activeServer && !alreadySet) {
          setConnectedServer(activeServer)
          connectedServerRef.current = activeServer
          setShouldConnect(true)
          scrollToTerminal()

          if (!options?.silent) {
            toast({
              title: "Session Restored",
              description: `Reconnected to ${activeServer.name}`,
            })
          }
        }
      }

      return updatedServers
    } catch (error) {
      console.error("Failed to load servers:", error)
      if (!options?.silent) {
        toast({
          title: "Error",
          description: "Failed to load servers from backend",
          variant: "destructive",
        })
      }
      return []
    }
  }, [scrollToTerminal, toast])

  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout> | null = null
    let isMounted = true

    const load = async (attempt: number) => {
      const result = await refreshServers(attempt > 0 ? { silent: true } : undefined)
      // Retry a couple of times if nothing came back (e.g. auth/storage still rehydrating)
      if (isMounted && result.length === 0 && attempt < 2) {
        retryTimeout = setTimeout(() => load(attempt + 1), 800)
      }
    }

    load(0)

    // Refresh server status every 30 seconds, but skip if actively connected
    const interval = setInterval(() => {
      if (!connectedServerRef.current) {
        refreshServers({ silent: true })
      }
    }, 30000)

    return () => {
      isMounted = false
      clearInterval(interval)
      if (retryTimeout) {
        clearTimeout(retryTimeout)
      }
    }
  }, [refreshServers])

  const [isAddServerOpen, setIsAddServerOpen] = useState(false)
  const [newServer, setNewServer] = useState({
    name: "",
    host: "",
    port: 22,
    username: "",
    password: "",
  })

  const handleAddServer = async () => {
    try {
      const server = await sshApi.createServer({
        name: newServer.name,
        host: newServer.host,
        port: newServer.port,
        username: newServer.username,
        password: newServer.password,
      })

      setServers([...servers, server])
      setIsAddServerOpen(false)
      setNewServer({ name: "", host: "", port: 22, username: "", password: "" })

      toast({
        title: "Server added",
        description: `${server.name} has been added successfully.`,
      })
    } catch (error) {
      console.error("Failed to add server:", error)
      toast({
        title: "Error",
        description: "Failed to add server",
        variant: "destructive",
      })
    }
  }

  const handleConnect = (server: SSHServer) => {
    // Prevent multiple connections
    if (server.status === 'connecting' || server.status === 'connected') {
      return
    }

    // Disconnect any previous SSH session before starting a new one
    if (connectedServerRef.current && connectedServerRef.current.id !== server.id) {
      wsService.disconnectSSH(connectedServerRef.current.id)
      setServers(prev => prev.map(s =>
        s.id === connectedServerRef.current!.id ? { ...s, status: 'offline' as const } : s
      ))
    }

    // Update status to connecting
    setServers(prev => prev.map(s =>
      s.id === server.id ? { ...s, status: 'connecting' as const } : s
    ))

    setConnectingServerId(server.id)
    connectingServerIdRef.current = server.id
    setConnectedServer(server)
    connectedServerRef.current = server
    setShouldConnect(true)

    toast({
      title: "Connecting...",
      description: `Establishing SSH connection to ${server.name}`,
    })

    scrollToTerminal()

    // The Terminal component will handle the actual connection via WebSocket
    // and we'll update the status based on SSH events
  }

  const handleDisconnect = async () => {
    const serverToDisconnect = connectedServerRef.current

    // Clear connection state
    setConnectedServer(null)
    connectedServerRef.current = null
    setShouldConnect(false)
    setConnectingServerId(null)
    connectingServerIdRef.current = null

    // Test if server is still accessible (online) or truly offline
    if (serverToDisconnect) {
      const socket = wsService.getSocket() || wsService.connect()
      if (socket) {
        wsService.disconnectSSH(serverToDisconnect.id)
      }

      // First set to offline temporarily
      setServers(prev => prev.map(s =>
        s.id === serverToDisconnect.id ? { ...s, status: 'offline' as const } : s
      ))

      // Test connectivity - if port is accessible, change to online
      try {
        await sshApi.testConnection(serverToDisconnect.id)
        setServers(prev => prev.map(s =>
          s.id === serverToDisconnect.id ? { ...s, status: 'online' as const } : s
        ))
      } catch (error) {
        // Server is truly offline, keep as offline
      }

      await refreshServers({ silent: true })
    }

    toast({
      title: "Disconnected",
      description: "SSH connection closed",
    })
  }

  const handleDelete = async (id: string) => {
    try {
      await sshApi.deleteServer(id)
      setServers(servers.filter((s) => s.id !== id))
      toast({
        title: "Server removed",
        description: "Server has been removed from the list.",
      })
    } catch (error) {
      console.error("Failed to delete server:", error)
      toast({
        title: "Error",
        description: "Failed to delete server",
        variant: "destructive",
      })
    }
  }

  const handleRefreshServers = async () => {
    setIsRefreshing(true)
    try {
      // Reload servers, ping and recover any active session
      await refreshServers({ silent: true })
      toast({
        title: "Servers refreshed",
        description: "Server status has been updated.",
      })
    } catch (error) {
      console.error("Failed to refresh servers:", error)
      toast({
        title: "Error",
        description: "Failed to refresh servers",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-2">
            SSH Terminal<span className="text-muted-foreground"></span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Acesso remoto aos seus servidores via terminal web.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handleRefreshServers}
            disabled={isRefreshing}
            className="flex-1 sm:flex-none border-white/10 hover:bg-white/5"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isAddServerOpen} onOpenChange={setIsAddServerOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_-5px_var(--primary)]">
                <Plus className="h-4 w-4 mr-2" />
                Add Server
              </Button>
            </DialogTrigger>
          <DialogContent className="bg-black/95 border-white/10">
            <DialogHeader>
              <DialogTitle>Add New SSH Server</DialogTitle>
              <DialogDescription>
                Enter the connection details for your SSH server.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Server Name</Label>
                <Input
                  id="name"
                  placeholder="My Server"
                  value={newServer.name}
                  onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host">Host / IP Address</Label>
                <Input
                  id="host"
                  placeholder="192.168.1.100 or server.example.com"
                  value={newServer.host}
                  onChange={(e) => setNewServer({ ...newServer, host: e.target.value })}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={newServer.port}
                    onChange={(e) => setNewServer({ ...newServer, port: parseInt(e.target.value) })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="root"
                    value={newServer.username}
                    onChange={(e) => setNewServer({ ...newServer, username: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="SSH password"
                  value={newServer.password}
                  onChange={(e) => setNewServer({ ...newServer, password: e.target.value })}
                  className="bg-white/5 border-white/10"
                />
                <p className="text-xs text-muted-foreground">
                  Password will be encrypted and stored securely
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <Button variant="outline" onClick={() => setIsAddServerOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddServer} className="bg-primary hover:bg-primary/90">
                Add Server
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </header>

      {/* Stats */}
      <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-4">
        <Card className="glass-card border-0 bg-black/40">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Servers</p>
                <p className="text-xl md:text-2xl font-bold mt-2">{servers.length}</p>
              </div>
              <Server className="h-6 w-6 md:h-8 md:w-8 shrink-0 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 bg-black/40">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Online</p>
                <p className="text-xl md:text-2xl font-bold mt-2 text-green-500">
                  {servers.filter((s) => s.status === "online").length}
                </p>
              </div>
              <Activity className="h-6 w-6 md:h-8 md:w-8 shrink-0 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 bg-black/40">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Offline</p>
                <p className="text-xl md:text-2xl font-bold mt-2 text-muted-foreground">
                  {servers.filter((s) => s.status === "offline").length}
                </p>
              </div>
              <HardDrive className="h-6 w-6 md:h-8 md:w-8 shrink-0 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 bg-black/40">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Active Sessions</p>
                <p className="text-xl md:text-2xl font-bold mt-2 text-blue-500">
                  {servers.filter((s) => s.status === "connected").length}
                </p>
              </div>
              <TerminalIcon className="h-6 w-6 md:h-8 md:w-8 shrink-0 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Servers List */}
      <Card className="glass-card border-0 bg-black/40">
        <CardHeader>
          <CardTitle>Available Servers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {servers.map((server) => (
              <ServerCard
                key={server.id}
                server={server}
                onConnect={() => handleConnect(server)}
                onDelete={() => handleDelete(server.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Terminal */}
      <Card ref={terminalCardRef} className={`glass-card border-0 bg-black/90 transition-all ${isTerminalFullscreen ? 'fixed inset-2 sm:inset-4 z-50 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]' : ''}`}>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex flex-wrap items-center gap-2">
              <TerminalIcon className="h-5 w-5 text-primary shrink-0" />
              Terminal
              {connectedServer && (
                <Badge variant="outline" className="border-green-500/50 text-green-500">
                  Connected: {connectedServer.name}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {connectedServer && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/10 hover:bg-white/5 text-primary"
                  onClick={handleDisconnect}
                >
                  <X className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                className="border-white/10 hover:bg-white/5"
                onClick={() => setIsTerminalFullscreen(!isTerminalFullscreen)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Terminal
            serverId={connectedServer?.id}
            shouldConnect={shouldConnect}
            onData={(data) => {
              console.log("Terminal data:", data)
            }}
            onConnected={() => {
              // Update server status to connected when SSH connects
              console.log('SSH onConnected callback triggered for server:', connectedServerRef.current?.id)
              setConnectingServerId(null)
              connectingServerIdRef.current = null
              if (connectedServerRef.current) {
                setServers(prev => {
                  const updated = prev.map(s =>
                    s.id === connectedServerRef.current!.id ? { ...s, status: 'connected' as const } : s
                  )
                  console.log('Updated servers after SSH connect:', updated)
                  return updated
                })
              }
            }}
            onDisconnected={async () => {
              setConnectingServerId(null)
              connectingServerIdRef.current = null
              // Test if server is still accessible (online) or truly offline
              if (connectedServerRef.current) {
                const serverId = connectedServerRef.current.id
                setConnectedServer(null)
                connectedServerRef.current = null
                setShouldConnect(false)
                // First set to offline temporarily
                setServers(prev => prev.map(s =>
                  s.id === serverId ? { ...s, status: 'offline' as const } : s
                ))

                // Test connectivity - if port is accessible, change to online
                try {
                  await sshApi.testConnection(serverId)
                  setServers(prev => prev.map(s =>
                    s.id === serverId ? { ...s, status: 'online' as const } : s
                  ))
                } catch (error) {
                  // Server is truly offline, keep as offline
                }
              }
            }}
            onError={(error) => {
              toast({
                title: "Connection Error",
                description: error,
                variant: "destructive",
              })
              // Update server status to offline on error and clear connection
              if (connectedServerRef.current) {
                const serverId = connectedServerRef.current.id
                setConnectingServerId(null)
                connectingServerIdRef.current = null
                setServers(prev => prev.map(s =>
                  s.id === serverId ? { ...s, status: 'offline' as const } : s
                ))
                // Clear connection state to prevent reconnection attempts
                setConnectedServer(null)
                connectedServerRef.current = null
                setShouldConnect(false)
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function ServerCard({
  server,
  onConnect,
  onDelete,
}: {
  server: SSHServer
  onConnect: () => void
  onDelete: () => void
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-blue-500"
      case "online":
        return "bg-green-500"
      case "offline":
        return "bg-gray-500"
      case "connecting":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/50">Connected</Badge>
      case "online":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/50">Online</Badge>
      case "offline":
        return <Badge variant="outline" className="border-gray-500/50 text-gray-500">Offline</Badge>
      case "connecting":
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50">Connecting</Badge>
      default:
        return null
    }
  }

  const formatLastConnected = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    // Format as "Nov 30, 7:24 PM"
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
      <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
        <div className={`h-3 w-3 shrink-0 mt-1.5 sm:mt-0 rounded-full ${getStatusColor(server.status)} animate-pulse`} />
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium break-all">{server.name}</p>
            {getStatusBadge(server.status)}
            {server.tags && server.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs border-white/20">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1 min-w-0">
              <Globe className="h-3 w-3 shrink-0" />
              <span className="break-all">{server.username}@{server.host}:{server.port}</span>
            </span>
            {server.lastConnected && (
              <span className="text-xs shrink-0">Last Access: {formatLastConnected(server.lastConnected)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          aria-label="Editar servidor"
          className="border-white/10 hover:bg-white/5"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-label="Eliminar servidor"
          className="border-white/10 hover:bg-white/5 text-primary hover:text-primary"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          onClick={onConnect}
          disabled={server.status === "connecting" || server.status === "connected"}
          className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          size="sm"
        >
          <TerminalIcon className="h-4 w-4 mr-2" />
          {server.status === "connected" ? "Connected" : server.status === "connecting" ? "Connecting..." : "Connect"}
        </Button>
      </div>
    </div>
  )
}
