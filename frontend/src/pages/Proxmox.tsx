import { useEffect, useRef, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { proxmoxApi, hostApi } from "@/services/api"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

type Resource = {
  id: string
  type: string
  status?: string
  node?: string
  vmid?: number
  name?: string
  cpu?: number
  maxcpu?: number
  mem?: number
  maxmem?: number
  disk?: number
  maxdisk?: number
}

export default function Proxmox() {
  const { toast } = useToast()
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [vmDetails, setVmDetails] = useState<Record<string, any>>({})
  const [ctDetails, setCtDetails] = useState<Record<string, any>>({})
  const [detailLoading, setDetailLoading] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState<NodeJS.Timeout | null>(null)
  const metricsTimer = useRef<NodeJS.Timeout | null>(null)
  const hostTimer = useRef<NodeJS.Timeout | null>(null)
  const [hostSamples, setHostSamples] = useState<any[]>([])
  const [metrics, setMetrics] = useState<Record<
    string,
    {
      cpu: any[]
      mem: any[]
      disk: any[]
      net: any[]
    }
  >>({})
  const [timeframe, setTimeframe] = useState<"hour" | "day" | "week">("hour")
  const [metricsLoading, setMetricsLoading] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await proxmoxApi.getClusterResources()
        setResources(data || [])
      } catch (error: any) {
        console.error("Failed to load Proxmox resources", error)
        toast({
          title: "Erro ao carregar Proxmox",
          description: error?.response?.data?.message || "Verifica config e token",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    load()

    // Auto refresh every 10s
    const timer = setInterval(load, 10000)
    setAutoRefresh(timer)

    return () => {
      if (timer) clearInterval(timer)
      if (autoRefresh) clearInterval(autoRefresh)
    }
  }, [toast])

  const nodes = useMemo(() => resources.filter(r => r.type === "node"), [resources])
  const vms = useMemo(() => resources.filter(r => r.type === "qemu"), [resources])
  const containers = useMemo(() => resources.filter(r => r.type === "lxc"), [resources])

  const refresh = async () => {
    try {
      setLoading(true)
      const data = await proxmoxApi.getClusterResources()
      setResources(data || [])
    } catch (error: any) {
      console.error("Failed to refresh Proxmox resources", error)
      toast({
        title: "Erro ao carregar Proxmox",
        description: error?.response?.data?.message || "Verifica config e token",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (type: "start" | "stop" | "reboot", kind: "vm" | "ct", node: string, vmid: number | string) => {
    const key = `${type}-${kind}-${node}-${vmid}`
    setActionLoading(key)
    try {
      if (kind === "vm") {
        if (type === "start") await proxmoxApi.startVm(node, vmid)
        if (type === "stop") await proxmoxApi.stopVm(node, vmid)
        if (type === "reboot") await proxmoxApi.rebootVm(node, vmid)
      } else {
        if (type === "start") await proxmoxApi.startContainer(node, vmid)
        if (type === "stop") await proxmoxApi.stopContainer(node, vmid)
        if (type === "reboot") await proxmoxApi.rebootContainer(node, vmid)
      }
      toast({ title: `${type.toUpperCase()} enviado`, description: `${kind.toUpperCase()} ${vmid} @ ${node}` })
      refresh()
    } catch (error: any) {
      console.error("Proxmox action failed", error)
      toast({
        title: "Erro ao executar ação",
        description: error?.response?.data?.message || "Verifica permissões/token",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const loadVmStatus = async (node: string, vmid: number | string) => {
    const key = `vm-${node}-${vmid}`
    setDetailLoading(key)
    try {
      const data = await proxmoxApi.getQemuVmStatus(node, vmid)
      setVmDetails(prev => ({ ...prev, [key]: data }))
    } catch (error: any) {
      console.error("Failed to load VM status", error)
      toast({
        title: "Erro ao obter status da VM",
        description: error?.response?.data?.message || "Verifica permissões/token",
        variant: "destructive",
      })
    } finally {
      setDetailLoading(null)
    }
  }

  const loadCtStatus = async (node: string, vmid: number | string) => {
    const key = `ct-${node}-${vmid}`
    setDetailLoading(key)
    try {
      const data = await proxmoxApi.getLxcContainerStatus(node, vmid)
      setCtDetails(prev => ({ ...prev, [key]: data }))
    } catch (error: any) {
      console.error("Failed to load CT status", error)
      toast({
        title: "Erro ao obter status do container",
        description: error?.response?.data?.message || "Verifica permissões/token",
        variant: "destructive",
      })
    } finally {
      setDetailLoading(null)
    }
  }

  const formatBytesGB = (val?: number) => ((val || 0) / 1e9).toFixed(1)
  const formatNetMb = (val?: number) => ((val || 0) / 1_000_000).toFixed(2)

  const resourcesById = useMemo(() => {
    const map: Record<string, Resource> = {}
    resources.forEach(r => { map[r.id] = r })
    return map
  }, [resources])

  const hostCharts = useMemo(() => {
    return {
      cpuLoad: hostSamples.map(s => ({ time: s.time, value: s.cpuLoad })),
      cpuTemp: hostSamples.filter(s => s.cpuTemp !== null).map(s => ({ time: s.time, value: s.cpuTemp })),
      mem: hostSamples.map(s => ({ time: s.time, value: s.memPct })),
      disk: hostSamples.map(s => ({ time: s.time, value: s.diskPct })),
      net: hostSamples.map(s => ({ time: s.time, value: s.netMb })),
      watts: hostSamples.filter(s => s.watts !== null).map(s => ({ time: s.time, value: s.watts })),
    }
  }, [hostSamples])

  const buildChartData = (points: any[]) => {
    const base = (points || []).map(p => {
      const time = new Date(p.time * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      const cpuRaw = p.cpu !== undefined && p.cpu !== null ? +(p.cpu * 100).toFixed(2) : null
      const cpu = cpuRaw === null ? null : Math.max(cpuRaw, 0.5) // evita 0% visual
      const mem = p.mem && p.maxmem ? +(((p.mem / p.maxmem) * 100) || 0).toFixed(2) : null
      const disk = p.disk && p.maxdisk ? +(((p.disk / p.maxdisk) * 100) || 0).toFixed(2) : null
      const net = p.netin && p.netout ? +(formatNetMb(p.netin + p.netout)) : null
      return { time, cpu, mem, disk, net }
    })
    return {
      cpu: base.filter(({ cpu }) => cpu !== null).map(({ time, cpu }) => ({ time, value: cpu as number })),
      mem: base.filter(({ mem }) => mem !== null).map(({ time, mem }) => ({ time, value: mem as number })),
      disk: base.filter(({ disk }) => disk !== null).map(({ time, disk }) => ({ time, value: disk as number })),
      net: base.filter(({ net }) => net !== null).map(({ time, net }) => ({ time, value: net as number })),
    }
  }

  const loadMetrics = async (kind: "node" | "vm" | "ct", node: string, vmid?: number | string, showToast = true) => {
    const key = `${kind}-${node}${vmid ? `-${vmid}` : ""}-${timeframe}`
    setMetricsLoading(key)
    try {
      let data: any[] = []
      if (kind === "node") data = await proxmoxApi.getNodeMetrics(node, timeframe)
      if (kind === "vm" && vmid !== undefined) data = await proxmoxApi.getQemuMetrics(node, vmid, timeframe)
      if (kind === "ct" && vmid !== undefined) data = await proxmoxApi.getLxcMetrics(node, vmid, timeframe)
      setMetrics(prev => ({ ...prev, [key]: buildChartData(data || []) }))
    } catch (error: any) {
      console.error("Failed to load metrics", error)
      if (showToast) {
        toast({
          title: "Erro ao obter métricas",
          description: error?.response?.data?.message || "Verifica permissões/token",
          variant: "destructive",
        })
      }
    } finally {
      setMetricsLoading(null)
    }
  }

  // Auto load metrics for current resources/timeframe and refresh periodically
  useEffect(() => {
    const loadAllMetrics = () => {
      nodes.forEach(n => loadMetrics("node", n.node || n.id, undefined, false))
      vms.forEach(vm => loadMetrics("vm", vm.node || "", vm.vmid || 0, false))
      containers.forEach(ct => loadMetrics("ct", ct.node || "", ct.vmid || 0, false))
    }

    loadAllMetrics()

    if (metricsTimer.current) clearInterval(metricsTimer.current)
    metricsTimer.current = setInterval(loadAllMetrics, 5000)

    return () => {
      if (metricsTimer.current) clearInterval(metricsTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, vms, containers, timeframe])

  // Host-level metrics (local sensors) polled every 5s, keep short history
  useEffect(() => {
    const loadHost = async () => {
      try {
        const data = await hostApi.getMetrics()
        const memPct = data?.memory?.total ? (data.memory.used / data.memory.total) * 100 : 0
        const diskPct = data?.disks?.[0]?.use || 0
        const netMb = data?.network?.aggregate
          ? ((data.network.aggregate.rx_sec || 0) + (data.network.aggregate.tx_sec || 0)) / 1_000_000
          : 0
        const sample = {
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          cpuLoad: data?.cpu?.load != null ? Math.max(+(data.cpu.load.toFixed(2)), 0.5) : null,
          cpuTemp: data?.cpu?.temp || null,
          memPct: data?.memory?.total ? +memPct.toFixed(2) : null,
          diskPct: data?.disks?.[0]?.use != null ? +diskPct.toFixed(2) : null,
          netMb: +netMb.toFixed(2),
          watts: data?.power?.watts || null,
        }
        setHostSamples(prev => {
          const next = [...prev, sample]
          return next.slice(-120) // ~10 min history at 5s
        })
      } catch (error: any) {
        console.error("Failed to load host metrics", error)
      }
    }

    loadHost()
    if (hostTimer.current) clearInterval(hostTimer.current)
    hostTimer.current = setInterval(loadHost, 5000)

    return () => {
      if (hostTimer.current) clearInterval(hostTimer.current)
    }
  }, [])

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          Proxmox <span className="text-muted-foreground">Cluster</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Estado dos nós, VMs e containers.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card border-0 bg-black/50">
          <CardHeader><CardTitle>Nodes</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold flex items-end justify-between">
            <span>{nodes.length}</span>
            <Button size="sm" variant="outline" className="border-white/10" onClick={refresh} disabled={loading}>
              Refresh
            </Button>
          </CardContent>
        </Card>
        <Card className="glass-card border-0 bg-black/50">
          <CardHeader><CardTitle>VMs (QEMU)</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{vms.length}</CardContent>
        </Card>
        <Card className="glass-card border-0 bg-black/50">
          <CardHeader><CardTitle>Containers (LXC)</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{containers.length}</CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Select value={timeframe} onValueChange={(v) => setTimeframe(v as any)}>
          <SelectTrigger className="w-[150px] bg-black/50 border-white/10">
            <SelectValue placeholder="Timeframe" />
          </SelectTrigger>
          <SelectContent className="bg-black/90 border-white/10">
            <SelectItem value="hour">Última hora</SelectItem>
            <SelectItem value="day">Último dia</SelectItem>
            <SelectItem value="week">Última semana</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">Charts para node/VM/CT com base no timeframe escolhido.</p>
      </div>

      <Card className="glass-card border-0 bg-black/40">
        <CardHeader>
          <CardTitle>Métricas do Host (local)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Leitura direta do host Proxmox (sensors/systeminformation) a cada 5s.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="h-32 space-y-1">
            <p className="text-xs text-muted-foreground">CPU Load %</p>
            <MetricChart data={hostCharts.cpuLoad} color="#F0003C" label="CPU %" domain={[0, 100]} />
          </div>
          <div className="h-32 space-y-1">
            <p className="text-xs text-muted-foreground">CPU Temp (°C)</p>
            <MetricChart data={hostCharts.cpuTemp} color="#f97316" label="Temp °C" domain={[0, 100]} />
          </div>
          <div className="h-32 space-y-1">
            <p className="text-xs text-muted-foreground">Memória %</p>
            <MetricChart data={hostCharts.mem} color="#3b82f6" label="Mem %" domain={[0, 100]} />
          </div>
          <div className="h-32 space-y-1">
            <p className="text-xs text-muted-foreground">Disco %</p>
            <MetricChart data={hostCharts.disk} color="#8b5cf6" label="Disk %" domain={[0, 100]} />
          </div>
          <div className="h-32 space-y-1">
            <p className="text-xs text-muted-foreground">Rede MB/s (agg)</p>
            <MetricChart data={hostCharts.net} color="#10b981" label="Net MB/s" domain={[0, 200]} />
          </div>
          <div className="h-32 space-y-1">
            <p className="text-xs text-muted-foreground">Watts (se disponível)</p>
            <MetricChart data={hostCharts.watts} color="#eab308" label="Watts" domain={[0, 500]} />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-0 bg-black/40">
        <CardHeader>
          <CardTitle>Nodes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">A carregar...</p>}
          {!loading && nodes.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum node encontrado.</p>
          )}
          {nodes.map((n) => (
            <div key={n.id} className="flex items-center justify-between rounded-lg border border-white/10 p-3">
              <div>
                <p className="font-medium">{n.id}</p>
                <p className="text-xs text-muted-foreground">
                  CPU {((n.cpu || 0) * 100).toFixed(1)}% • Mem {formatBytesGB(n.mem)} GB
                </p>
                <div className="h-1.5 w-full bg-white/5 rounded mt-2 overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min(100, (n.cpu || 0) * 100)}%` }}
                  />
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded mt-1 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${Math.min(100, ((n.mem || 0) / (n.maxmem || 1)) * 100)}%` }}
                  />
                </div>
              </div>
              <Badge variant={n.status === "online" ? "default" : "outline"}>
                {n.status || "unknown"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Node-level charts removidos a pedido; mantemos apenas métricas do host local e VMs/CTs */}

      <Card className="glass-card border-0 bg-black/40">
        <CardHeader>
          <CardTitle>VMs (QEMU)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {vms.length === 0 && !loading && <p className="text-sm text-muted-foreground">Nenhuma VM.</p>}
          {vms.map(vm => {
            const keyRunning = vm.status === "running"
            const metricsKey = `vm-${vm.node}-${vm.vmid}-${timeframe}`
            const chartData = metrics[metricsKey] || { cpu: [], mem: [], disk: [], net: [] }
            return (
              <div key={vm.id} className="rounded-lg border border-white/10 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{vm.name || vm.id}</p>
                  <Badge variant={keyRunning ? "default" : "outline"}>{vm.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">VMID {vm.vmid} • Node {vm.node}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10"
                    disabled={actionLoading === `start-vm-${vm.node}-${vm.vmid}` || keyRunning}
                    onClick={() => handleAction("start", "vm", vm.node || "", vm.vmid || 0)}
                  >
                    Start
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10"
                    disabled={actionLoading === `stop-vm-${vm.node}-${vm.vmid}` || !keyRunning}
                    onClick={() => handleAction("stop", "vm", vm.node || "", vm.vmid || 0)}
                  >
                    Stop
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10"
                    disabled={actionLoading === `reboot-vm-${vm.node}-${vm.vmid}` || !keyRunning}
                    onClick={() => handleAction("reboot", "vm", vm.node || "", vm.vmid || 0)}
                  >
                    Reboot
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10"
                    disabled={detailLoading === `vm-${vm.node}-${vm.vmid}`}
                    onClick={() => loadVmStatus(vm.node || "", vm.vmid || 0)}
                  >
                    Detalhes
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10"
                    disabled={metricsLoading === metricsKey}
                    onClick={() => loadMetrics("vm", vm.node || "", vm.vmid || 0)}
                  >
                    Métricas
                  </Button>
                </div>
                {vmDetails[`vm-${vm.node}-${vm.vmid}`] && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>CPU: {((vmDetails[`vm-${vm.node}-${vm.vmid}`].cpu || 0) * 100).toFixed(1)}%</p>
                    <p>Mem: {formatBytesGB(vmDetails[`vm-${vm.node}-${vm.vmid}`].mem)} / {formatBytesGB(vmDetails[`vm-${vm.node}-${vm.vmid}`].maxmem)} GB</p>
                    <div className="h-1.5 w-full bg-white/5 rounded overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{
                          width: `${Math.min(100, ((vmDetails[`vm-${vm.node}-${vm.vmid}`].mem || 0) / (vmDetails[`vm-${vm.node}-${vm.vmid}`].maxmem || 1)) * 100)}%`
                        }}
                      />
                    </div>
                    <p>Disk: {formatBytesGB(vmDetails[`vm-${vm.node}-${vm.vmid}`].disk)} / {formatBytesGB(vmDetails[`vm-${vm.node}-${vm.vmid}`].maxdisk)} GB</p>
                    <div className="h-1.5 w-full bg-white/5 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${Math.min(100, ((vmDetails[`vm-${vm.node}-${vm.vmid}`].disk || 0) / (vmDetails[`vm-${vm.node}-${vm.vmid}`].maxdisk || 1)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="h-32 space-y-1">
                    <p className="text-xs text-muted-foreground">CPU %</p>
                    <MetricChart data={chartData.cpu} color="#F0003C" label="CPU %" domain={[0, 100]} />
                  </div>
                  <div className="h-32 space-y-1">
                    <p className="text-xs text-muted-foreground">Mem %</p>
                    <MetricChart data={chartData.mem} color="#3b82f6" label="Mem %" domain={[0, 100]} />
                  </div>
                  <div className="h-32 space-y-1">
                    <p className="text-xs text-muted-foreground">Disco %</p>
                    <MetricChart data={chartData.disk} color="#8b5cf6" label="Disk %" domain={[0, 100]} />
                  </div>
                  <div className="h-32 space-y-1">
                    <p className="text-xs text-muted-foreground">Rede MB/s</p>
                    <MetricChart data={chartData.net} color="#10b981" label="Net MB/s" domain={[0, 200]} />
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card className="glass-card border-0 bg-black/40">
        <CardHeader>
          <CardTitle>Containers (LXC)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {containers.length === 0 && !loading && <p className="text-sm text-muted-foreground">Nenhum container.</p>}
          {containers.map(ct => {
            const running = ct.status === "running"
            const metricsKey = `ct-${ct.node}-${ct.vmid}-${timeframe}`
            const chartData = metrics[metricsKey] || { cpu: [], mem: [], disk: [], net: [] }
            return (
              <div key={ct.id} className="rounded-lg border border-white/10 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{ct.name || ct.id}</p>
                  <Badge variant={running ? "default" : "outline"}>{ct.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">CTID {ct.vmid} • Node {ct.node}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10"
                    disabled={actionLoading === `start-ct-${ct.node}-${ct.vmid}` || running}
                    onClick={() => handleAction("start", "ct", ct.node || "", ct.vmid || 0)}
                  >
                    Start
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10"
                    disabled={actionLoading === `stop-ct-${ct.node}-${ct.vmid}` || !running}
                    onClick={() => handleAction("stop", "ct", ct.node || "", ct.vmid || 0)}
                  >
                    Stop
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10"
                    disabled={actionLoading === `reboot-ct-${ct.node}-${ct.vmid}` || !running}
                    onClick={() => handleAction("reboot", "ct", ct.node || "", ct.vmid || 0)}
                  >
                    Reboot
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10"
                    disabled={detailLoading === `ct-${ct.node}-${ct.vmid}`}
                    onClick={() => loadCtStatus(ct.node || "", ct.vmid || 0)}
                  >
                    Detalhes
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10"
                    disabled={metricsLoading === metricsKey}
                    onClick={() => loadMetrics("ct", ct.node || "", ct.vmid || 0)}
                  >
                    Métricas
                  </Button>
                </div>
                {ctDetails[`ct-${ct.node}-${ct.vmid}`] && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>CPU: {((ctDetails[`ct-${ct.node}-${ct.vmid}`].cpu || 0) * 100).toFixed(1)}%</p>
                    <p>Mem: {formatBytesGB(ctDetails[`ct-${ct.node}-${ct.vmid}`].mem)} / {formatBytesGB(ctDetails[`ct-${ct.node}-${ct.vmid}`].maxmem)} GB</p>
                    <div className="h-1.5 w-full bg-white/5 rounded overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{
                          width: `${Math.min(100, ((ctDetails[`ct-${ct.node}-${ct.vmid}`].mem || 0) / (ctDetails[`ct-${ct.node}-${ct.vmid}`].maxmem || 1)) * 100)}%`
                        }}
                      />
                    </div>
                    <p>Disk: {formatBytesGB(ctDetails[`ct-${ct.node}-${ct.vmid}`].disk)} / {formatBytesGB(ctDetails[`ct-${ct.node}-${ct.vmid}`].maxdisk)} GB</p>
                    <div className="h-1.5 w-full bg-white/5 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${Math.min(100, ((ctDetails[`ct-${ct.node}-${ct.vmid}`].disk || 0) / (ctDetails[`ct-${ct.node}-${ct.vmid}`].maxdisk || 1)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="h-32 space-y-1">
                    <p className="text-xs text-muted-foreground">CPU %</p>
                    <MetricChart data={chartData.cpu} color="#F0003C" label="CPU %" domain={[0, 100]} />
                  </div>
                  <div className="h-32 space-y-1">
                    <p className="text-xs text-muted-foreground">Mem %</p>
                    <MetricChart data={chartData.mem} color="#3b82f6" label="Mem %" domain={[0, 100]} />
                  </div>
                  <div className="h-32 space-y-1">
                    <p className="text-xs text-muted-foreground">Disco %</p>
                    <MetricChart data={chartData.disk} color="#8b5cf6" label="Disk %" domain={[0, 100]} />
                  </div>
                  <div className="h-32 space-y-1">
                    <p className="text-xs text-muted-foreground">Rede MB/s</p>
                    <MetricChart data={chartData.net} color="#10b981" label="Net MB/s" domain={[0, 200]} />
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
const MetricChart = ({
  data,
  color = "#F0003C",
  label,
  domain,
}: {
  data: any[]
  color?: string
  label: string
  domain?: [number, number] | ["auto", "auto"]
}) => {
  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground">Sem dados</p>
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
        <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" style={{ fontSize: 10 }} />
        <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: 10 }} domain={domain || ["auto", "auto"]} />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(0,0,0,0.9)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "rgba(255,255,255,0.7)" }}
          formatter={(value: any) => [`${value}`, label]}
        />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} name={label} />
      </LineChart>
    </ResponsiveContainer>
  )
}
