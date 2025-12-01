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
import { Monitor, Plus, Globe, HardDrive, Activity, Trash2, Edit, Maximize2, X, RefreshCw, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { rdpApi } from "@/services/api"
import { RDPViewer } from "@/components/rdp/RDPViewer"

interface RDPServer {
  id: string
  name: string
  host: string
  port: number
  username: string
  domain?: string
  status: "online" | "offline" | "connecting" | "connected"
  lastConnected?: string
  tags?: string[]
}

export default function RDP() {
  const { toast } = useToast()
  const [connectedServer, setConnectedServer] = useState<RDPServer | null>(null)
  const connectedServerRef = useRef<RDPServer | null>(null)
  const [shouldConnect, setShouldConnect] = useState(false)
  const [guacToken, setGuacToken] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [servers, setServers] = useState<RDPServer[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const rdpCardRef = useRef<HTMLDivElement>(null)

  const [isAddServerOpen, setIsAddServerOpen] = useState(false)
  const [newServer, setNewServer] = useState({
    name: "",
    host: "",
    port: 3389,
    username: "",
    password: "",
  })

  // Load servers from backend API
  const loadServers = async () => {
    try {
      const data = await rdpApi.getServers()
      // All servers start as offline - we'll test connectivity next
      setServers(data)

      // Test TCP connectivity for each server to mark as "online" if port is accessible
      const testResults = await Promise.allSettled(
        data.map(async (server: RDPServer) => {
          try {
            const result = await rdpApi.testConnection(server.id)
            return { serverId: server.id, online: result.success }
          } catch (error) {
            return { serverId: server.id, online: false }
          }
        })
      )

      // Update server statuses based on test results
      setServers(prev => prev.map(s => {
        const testResult = testResults.find(
          (r) => r.status === 'fulfilled' && r.value.serverId === s.id
        )

        if (testResult && testResult.status === 'fulfilled') {
          // Only update if server is currently offline (don't override connecting/connected)
          if (s.status === 'offline') {
            return { ...s, status: testResult.value.online ? 'online' as const : 'offline' as const }
          }
        }

        return s
      }))

      return data
    } catch (error) {
      console.error("Failed to load servers:", error)
      toast({
        title: "Error",
        description: "Failed to load servers from backend",
        variant: "destructive",
      })
      return []
    }
  }

  useEffect(() => {
    loadServers()
  }, [])

  const handleAddServer = async () => {
    try {
      const server = await rdpApi.createServer({
        name: newServer.name,
        host: newServer.host,
        port: newServer.port,
        username: newServer.username,
        password: newServer.password,
      })

      setServers([...servers, server])
      setIsAddServerOpen(false)
      setNewServer({ name: "", host: "", port: 3389, username: "", password: "" })

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

  const handleConnect = async (server: RDPServer) => {
    if (server.status === 'connecting' || server.status === 'connected') {
      return
    }

    setServers(prev => prev.map(s =>
      s.id === server.id ? { ...s, status: 'connecting' as const } : s
    ))

    setShouldConnect(false)
    setGuacToken(null)

    toast({
      title: "Connecting...",
      description: `Establishing RDP connection to ${server.name}`,
    })

    try {
      const { token } = await rdpApi.getGuacToken(server.id)

      setGuacToken(token)
      setConnectedServer(server)
      connectedServerRef.current = server
      setShouldConnect(true)

      // Scroll to RDP viewer
      setTimeout(() => {
        rdpCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (error: any) {
      console.error("Failed to connect RDP:", error)
      setServers(prev => prev.map(s =>
        s.id === server.id ? { ...s, status: 'offline' as const } : s
      ))
      toast({
        title: "Connection Error",
        description: error?.response?.data?.message || "Failed to start RDP session",
        variant: "destructive",
      })
    }
  }

  const handleDisconnect = async () => {
    const serverToDisconnect = connectedServerRef.current

    setConnectedServer(null)
    connectedServerRef.current = null
    setShouldConnect(false)
    setGuacToken(null)

    if (serverToDisconnect) {
      setServers(prev => prev.map(s =>
        s.id === serverToDisconnect.id ? { ...s, status: 'offline' as const } : s
      ))
    }

    toast({
      title: "Disconnected",
      description: "RDP connection closed",
    })
  }

  // Stable callbacks to prevent re-renders
  const handleRDPConnected = useCallback(() => {
    console.log('RDP onConnected callback triggered')
    if (connectedServerRef.current) {
      setServers(prev => prev.map(s =>
        s.id === connectedServerRef.current!.id ? { ...s, status: 'connected' as const } : s
      ))
    }
  }, [])

  const handleRDPDisconnected = useCallback(() => {
    if (connectedServerRef.current) {
      const serverId = connectedServerRef.current.id
      setServers(prev => prev.map(s =>
        s.id === serverId ? { ...s, status: 'offline' as const } : s
      ))
    }
  }, [])

  const handleRDPError = useCallback((error: string) => {
    toast({
      title: "Connection Error",
      description: error,
      variant: "destructive",
    })
    if (connectedServerRef.current) {
      const serverId = connectedServerRef.current.id
      setServers(prev => prev.map(s =>
        s.id === serverId ? { ...s, status: 'offline' as const } : s
      ))
      setConnectedServer(null)
      connectedServerRef.current = null
      setShouldConnect(false)
    }
  }, [toast])

  const handleDelete = async (id: string) => {
    try {
      await rdpApi.deleteServer(id)
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

  const handleDownloadRDPFile = async (server: RDPServer) => {
    try {
      const blob = await rdpApi.downloadRDPFile(server.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${server.name || 'server'}.rdp`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      toast({
        title: "RDP file ready",
        description: `Abra ${server.name} com o cliente RDP do seu sistema.`,
      })
    } catch (error) {
      console.error("Failed to download RDP file:", error)
      toast({
        title: "Download failed",
        description: "Could not generate the RDP file. Try again.",
        variant: "destructive",
      })
    }
  }

  const handleRefreshServers = async () => {
    setIsRefreshing(true)
    try {
      await loadServers()
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
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Remote Desktop (RDP)
          </h1>
          <p className="text-muted-foreground text-lg">
            Acesso remoto a servidores Windows via navegador web.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRefreshServers}
            disabled={isRefreshing}
            className="border-white/10 hover:bg-white/5"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isAddServerOpen} onOpenChange={setIsAddServerOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_-5px_var(--primary)]">
                <Plus className="h-4 w-4 mr-2" />
                Add Server
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-black/95 border-white/10">
              <DialogHeader>
                <DialogTitle>Add New RDP Server</DialogTitle>
                <DialogDescription>
                  Enter the connection details for your Windows server.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Server Name</Label>
                  <Input
                    id="name"
                    placeholder="Windows Server"
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
                      placeholder="Administrator"
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
                    placeholder="RDP password"
                    value={newServer.password}
                    onChange={(e) => setNewServer({ ...newServer, password: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Password will be encrypted and stored securely
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
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
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="glass-card border-0 bg-black/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Servers</p>
                <p className="text-2xl font-bold mt-2">{servers.length}</p>
              </div>
              <Monitor className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 bg-black/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Online</p>
                <p className="text-2xl font-bold mt-2 text-green-500">
                  {servers.filter((s) => s.status === "online").length}
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 bg-black/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Offline</p>
                <p className="text-2xl font-bold mt-2 text-muted-foreground">
                  {servers.filter((s) => s.status === "offline").length}
                </p>
              </div>
              <HardDrive className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 bg-black/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Sessions</p>
                <p className="text-2xl font-bold mt-2 text-blue-500">
                  {servers.filter((s) => s.status === "connected").length}
                </p>
              </div>
              <Monitor className="h-8 w-8 text-blue-500" />
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
                onDownload={() => handleDownloadRDPFile(server)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* RDP Viewer */}
      <Card ref={rdpCardRef} className={`glass-card border-0 bg-black/90 transition-all ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              Remote Desktop
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
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <RDPViewer
            serverId={connectedServer?.id}
            shouldConnect={shouldConnect}
            guacToken={guacToken || undefined}
            onConnected={() => {
              console.log('RDP onConnected callback triggered')
              if (connectedServerRef.current) {
                setServers(prev => prev.map(s =>
                  s.id === connectedServerRef.current!.id ? { ...s, status: 'connected' as const } : s
                ))
              }
            }}
            onDisconnected={() => {
              if (connectedServerRef.current) {
                const serverId = connectedServerRef.current.id
                setServers(prev => prev.map(s =>
                  s.id === serverId ? { ...s, status: 'offline' as const } : s
                ))
              }
            }}
            onError={(error) => {
              toast({
                title: "Connection Error",
                description: error,
                variant: "destructive",
              })
              if (connectedServerRef.current) {
                const serverId = connectedServerRef.current.id
                setServers(prev => prev.map(s =>
                  s.id === serverId ? { ...s, status: 'offline' as const } : s
                ))
                setConnectedServer(null)
                connectedServerRef.current = null
                setShouldConnect(false)
                setGuacToken(null)
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
  onDownload,
}: {
  server: RDPServer
  onConnect: () => void
  onDelete: () => void
  onDownload: () => void
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

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`h-3 w-3 rounded-full ${getStatusColor(server.status)} animate-pulse`} />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{server.name}</p>
            {getStatusBadge(server.status)}
            {server.tags && server.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs border-white/20">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {server.username}@{server.host}:{server.port}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 hover:bg-white/5"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 hover:bg-white/5 text-primary hover:text-primary"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 hover:bg-white/5"
          onClick={onDownload}
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          onClick={onConnect}
          disabled={server.status === "connecting" || server.status === "connected"}
          className="bg-primary hover:bg-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          size="sm"
        >
          <Monitor className="h-4 w-4 mr-2" />
          {server.status === "connected" ? "Connected" : server.status === "connecting" ? "Connecting..." : "Connect"}
        </Button>
      </div>
    </div>
  )
}
