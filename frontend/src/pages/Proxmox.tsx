import { useEffect, useRef, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { proxmoxApi, hostApi } from "@/services/api"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

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
  const [resourcesLoaded, setResourcesLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
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
        setResourcesLoaded(true)
      }
    }
    load()

    // Auto refresh every 5s
    const timer = setInterval(load, 5000)
    setAutoRefresh(timer)

    return () => {
      if (timer) clearInterval(timer)
      if (autoRefresh) clearInterval(autoRefresh)
    }
  }, [toast])

  const nodes = useMemo(() => resources.filter(r => r.type === "node"), [resources])
  const vms = useMemo(() => resources.filter(r => r.type === "qemu"), [resources])
  const runningVms = useMemo(() => vms.filter(vm => vm.status === "running"), [vms])
  const stoppedVms = useMemo(() => vms.filter(vm => vm.status !== "running"), [vms])
  const sortedRunningVms = useMemo(() => {
    return [...runningVms].sort((a, b) => ((b.cpu || 0) - (a.cpu || 0)))
  }, [runningVms])

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
      setResourcesLoaded(true)
    }
  }

  const handleAction = async (type: "start" | "stop" | "reboot", kind: "vm", node: string, vmid: number | string) => {
    const key = `${type}-${kind}-${node}-${vmid}`
    setActionLoading(key)
    try {
      if (type === "start") await proxmoxApi.startVm(node, vmid)
      if (type === "stop") await proxmoxApi.stopVm(node, vmid)
      if (type === "reboot") await proxmoxApi.rebootVm(node, vmid)
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
      net: hostSamples.map(s => ({ time: s.time, value: s.netMb })),
      watts: hostSamples.filter(s => s.watts !== null).map(s => ({ time: s.time, value: s.watts })),
    }
  }, [hostSamples])

  const hostDiskChart = useMemo(() => {
    const latestWithDisks = [...hostSamples].reverse().find(s => (s as any).disks?.length > 0) as any
    const latest = latestWithDisks?.disks || []

    const baseName = (name: string) => {
      const n = name.toLowerCase()
      const direct = n.match(/(nvme\d+n\d+|sd[a-z]+|vd[a-z]+|hd[a-z]+|md\d+)/)
      if (direct) return direct[0]
      if (n.includes("micron")) return "sda"
      if (n.includes("pve") || n.includes("data") || n.includes("root")) return "sdc"
      return name
    }

    const aggregated: Record<string, { used: number; size: number; pct?: number }> = {}
    latest.forEach((disk: any) => {
      if (!disk) return
      const base = baseName(disk.name || "disk")
      if (!aggregated[base]) aggregated[base] = { used: 0, size: 0 }
      if (typeof disk.size === "number" && typeof disk.used === "number") {
        aggregated[base].used += disk.used
        aggregated[base].size += disk.size
      } else if (typeof disk.usePct === "number") {
        aggregated[base].pct = disk.usePct
      }
    })

    // Se não tivermos sdb e temos outros, adiciona sdb=0 (disco vazio não montado)
    if (!aggregated["sdb"] && Object.keys(aggregated).length > 0) {
      aggregated["sdb"] = { used: 0, size: 1, pct: 0 }
    }

    const aggregatedList = Object.entries(aggregated).map(([name, val]) => {
      const pct = val.size > 0 ? (val.used / val.size) * 100 : val.pct ?? 0
      return { name, pct: Math.max(0, Math.min(100, +pct.toFixed(2))) }
    })

    const sortedKeys = aggregatedList
      .sort((a, b) => (b?.pct || 0) - (a?.pct || 0))
      .map(d => d.name)
      .slice(0, 6)

    const data = hostSamples.map(sample => {
      const row: Record<string, any> = { time: sample.time }
      const list = (sample as any).disks || []
      const agg: Record<string, { used: number; size: number; pct?: number }> = {}
      list.forEach((disk: any) => {
        const base = baseName(disk.name || "disk")
        if (!agg[base]) agg[base] = { used: 0, size: 0 }
        if (typeof disk.size === "number" && typeof disk.used === "number") {
          agg[base].used += disk.used
          agg[base].size += disk.size
        } else if (typeof disk.usePct === "number") {
          agg[base].pct = disk.usePct
        }
      })
      sortedKeys.forEach(k => {
        const val = agg[k]
        const pct = val
          ? val.size > 0
            ? (val.used / val.size) * 100
            : val.pct ?? null
          : k === "sdb"
            ? 0
            : null
        row[k] = pct != null ? Math.max(0, Math.min(100, +pct.toFixed(2))) : null
      })
      return row
    })

    if (sortedKeys.length === 0) {
      return {
        data: [{ time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }],
        keys: [],
      }
    }
    return { data, keys: sortedKeys }
  }, [hostSamples])

  const buildChartData = (points: any[]) => {
    const base = (points || []).map(p => {
      const time = new Date(p.time * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      const cpuRaw = p.cpu !== undefined && p.cpu !== null ? +(p.cpu * 100).toFixed(2) : null
      const cpu = cpuRaw === null ? null : Math.max(cpuRaw, 0.5) // evita 0% visual
      const mem = p.mem && p.maxmem ? +(((p.mem / p.maxmem) * 100) || 0).toFixed(2) : null
      const hasRate = p.diskread !== undefined || p.diskwrite !== undefined
      const diskRateMb = hasRate
        ? +((((p.diskread || 0) + (p.diskwrite || 0)) / 1_000_000) || 0).toFixed(2)
        : null
      const diskPct = p.disk && p.maxdisk ? +(((p.disk / p.maxdisk) * 100) || 0).toFixed(2) : null
      const disk = diskRateMb !== null ? diskRateMb : diskPct
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

  const loadMetrics = async (kind: "node" | "vm", node: string, vmid?: number | string, showToast = true) => {
    const key = `${kind}-${node}${vmid ? `-${vmid}` : ""}-${timeframe}`
    setMetricsLoading(key)
    try {
      let data: any[] = []
      if (kind === "node") data = await proxmoxApi.getNodeMetrics(node, timeframe)
      if (kind === "vm" && vmid !== undefined) data = await proxmoxApi.getQemuMetrics(node, vmid, timeframe)
      const resourceKey =
        kind === "node" ? `node/${node}` : kind === "vm" ? `qemu/${vmid}` : ""
      const resInfo = resourcesById[resourceKey]
      const hydrated = (data || []).map(p => ({
        ...p,
        maxdisk: p.maxdisk || resInfo?.maxdisk,
        disk: p.disk || resInfo?.disk,
      }))
      setMetrics(prev => {
        const nextData = buildChartData(hydrated || [])
        // Se a API devolver vazio (e.g. sem RRD ainda), preserva último dataset para não quebrar os gráficos.
        if ((!data || data.length === 0) && prev[key]) {
          return prev
        }
        return { ...prev, [key]: nextData }
      })
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
      vms.filter(vm => vm.status === "running").forEach(vm => loadMetrics("vm", vm.node || "", vm.vmid || 0, false))
    }

    loadAllMetrics()

    if (metricsTimer.current) clearInterval(metricsTimer.current)
    metricsTimer.current = setInterval(loadAllMetrics, 5000)

    return () => {
      if (metricsTimer.current) clearInterval(metricsTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, vms, timeframe])

  // Host-level metrics (local sensors) polled every 5s, keep short history
  useEffect(() => {
    const loadHost = async () => {
      try {
        const data = await hostApi.getMetrics()
        const latest = data?.latest || data
        const history = data?.history || []

        const toSample = (s: any) => {
          if (!s) return null
          const normalizeDiskName = (raw: string | undefined, idx: number) => {
            if (!raw) return `disk-${idx + 1}`
            if (raw.includes("/dev/")) return raw.replace(/^.*\/dev\//, "")
            return raw
          }
          const memPct = s?.memory?.total ? (s.memory.used / s.memory.total) * 100 : 0

          const rawDisks = (() => {
            // Prefer payload já pronto com percentuais por disco físico
            if (Array.isArray(s?.diskUsage)) return s.diskUsage
            if (s?.diskUsage && typeof s.diskUsage === "object") {
              return Object.entries(s.diskUsage).map(([name, val]: any, idx) => ({ name, idx, ...(val as any) }))
            }
            // Fallbacks antigos
            if (Array.isArray(s?.diskMetrics)) return s.diskMetrics
            if (Array.isArray(s?.disks)) return s.disks
            if (Array.isArray(s?.metrics)) return s.metrics
            if (s?.disks && typeof s.disks === "object") {
              return Object.entries(s.disks).map(([name, val]: any, idx) => ({ name, idx, ...(val as any) }))
            }
            return []
          })()

          const deriveLabel = (fs: string | undefined, mount: string | undefined, name?: string, idx?: number) => {
            if (name) return name
            if (fs) {
              if (fs.startsWith("/dev/mapper/")) return fs.replace("/dev/mapper/", "")
              if (fs.startsWith("/dev/")) {
                const trimmed = fs.replace("/dev/", "")
                const match = trimmed.match(/(nvme\d+n\d+|sd[a-z]+|vd[a-z]+|hd[a-z]+|md\d+)/)
                return match ? match[0] : trimmed
              }
            }
            if (mount) return mount
            return `disk-${(idx ?? 0) + 1}`
          }

          const disks = rawDisks
            .map((d: any, idx: number) => {
              const fsName = d?.fs ? String(d.fs) : undefined
              const mount = d?.mount ? String(d.mount) : undefined

              // Ignora filesystems virtuais/overlay
              if (fsName && /(loop|ram|fuse|overlay)/i.test(fsName)) return null

              const name = deriveLabel(fsName, mount, d?.name, idx)

              const usePct = (() => {
                if (typeof d?.usePct === "number") return d.usePct
                if (typeof d?.usedPercent === "number") return d.usedPercent
                if (typeof d?.use === "number") return d.use
                if (typeof d?.pct === "number") return d.pct
                if (typeof d?.used === "number" && typeof d?.size === "number" && d.size > 0) {
                  return (d.used / d.size) * 100
                }
                return null
              })()

              return {
                name,
                usePct: Number.isFinite(usePct) ? +(usePct as number) : null,
                size: typeof d?.size === "number" ? d.size : null,
                used: typeof d?.used === "number" ? d.used : null,
              }
            })
            .filter(Boolean)

          const netMb = s?.network?.aggregate
            ? ((s.network.aggregate.rx_sec || 0) + (s.network.aggregate.tx_sec || 0)) / 1_000_000
            : 0
          return {
            time: new Date((s.timestamp || Date.now() / 1000) * 1000).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            cpuLoad: s?.cpu?.load != null ? Math.max(+(s.cpu.load.toFixed(2)), 0.5) : null,
            cpuTemp: s?.cpu?.temp || null,
            memPct: s?.memory?.total ? +memPct.toFixed(2) : null,
            disks,
            netMb: +netMb.toFixed(2),
            watts: s?.power?.watts ?? null,
          }
        }

        const base = (history.length ? history : latest ? [latest] : []).map(toSample).filter(Boolean) as any[]
        setHostSamples(base.slice(-120)) // keep ~10 min history
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
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Proxmox Cluster</h1>
          <p className="text-muted-foreground text-lg">Estado dos nós e VMs.</p>
        </div>
        <Select value={timeframe} onValueChange={(v) => setTimeframe(v as any)}>
          <SelectTrigger className="w-[160px] bg-black/50 border-white/10">
            <SelectValue placeholder="Timeframe" />
          </SelectTrigger>
          <SelectContent className="bg-black/90 border-white/10">
            <SelectItem value="hour">Última hora</SelectItem>
            <SelectItem value="day">Último dia</SelectItem>
            <SelectItem value="week">Última semana</SelectItem>
          </SelectContent>
        </Select>
      </header>

      <div className="flex flex-wrap gap-2">
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm flex items-center gap-2">
          <span className="text-muted-foreground">Nodes</span>
          <span className="font-semibold">{nodes.length}</span>
          <Badge variant="outline" className="text-[11px]">online {nodes.filter(n => n.status === "online").length}</Badge>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm flex items-center gap-2">
          <span className="text-muted-foreground">VMs</span>
          <span className="font-semibold">{vms.length}</span>
          <Badge variant="outline" className="text-[11px]">{runningVms.length} online / {stoppedVms.length} off</Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
        <Card className="glass-card border-0 bg-black/40">
          <CardHeader>
            <CardTitle>Métricas do Host (local)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Leitura direta do host Proxmox (sensors/systeminformation) a cada 5s.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="h-28 space-y-1">
              <p className="text-xs text-muted-foreground">CPU Load %</p>
              <MetricChart data={hostCharts.cpuLoad} color="#F0003C" label="CPU %" domain={[0, 100]} />
            </div>
            <div className="h-28 space-y-1">
              <p className="text-xs text-muted-foreground">CPU Temp (°C)</p>
              <MetricChart data={hostCharts.cpuTemp} color="#f97316" label="Temp °C" domain={[0, 100]} />
            </div>
            <div className="h-28 space-y-1">
              <p className="text-xs text-muted-foreground">Memória %</p>
              <MetricChart data={hostCharts.mem} color="#3b82f6" label="Mem %" domain={[0, 100]} />
            </div>
            <div className="h-28 space-y-1">
              <p className="text-xs text-muted-foreground">Disco uso % (por disco)</p>
              <MultiMetricChart data={hostDiskChart.data} keys={hostDiskChart.keys} domain={[0, 100]} />
            </div>
            <div className="h-28 space-y-1">
              <p className="text-xs text-muted-foreground">Rede MB/s (agg)</p>
              <MetricChart data={hostCharts.net} color="#10b981" label="Net MB/s" domain={[0, 200]} />
            </div>
            <div className="h-28 space-y-1">
              <p className="text-xs text-muted-foreground">Watts</p>
              <MetricChart data={hostCharts.watts} color="#eab308" label="Watts" domain={[0, 500]} />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 bg-black/40">
          <CardHeader>
            <CardTitle>Top consumo (VMs online)</CardTitle>
            <p className="text-xs text-muted-foreground">Ordenado por uso de CPU no momento</p>
          </CardHeader>
          <CardContent className="space-y-3 min-h-[360px] max-h-[360px]">
            {sortedRunningVms.slice(0, 3).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma VM online.</p>}
            {sortedRunningVms.slice(0, 3).map((vm, idx) => (
              <div key={vm.id} className="flex items-center gap-3 rounded-lg border border-white/10 p-3">
                <div className="h-8 w-8 flex items-center justify-center rounded-full bg-white/5 text-sm font-semibold">
                  {idx + 1}
                </div>
                <div className="w-full space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{vm.name || vm.id}</p>
                    <Badge variant="outline" className="text-[11px]">VMID {vm.vmid}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Node {vm.node}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <CompactMeter
                      label="CPU"
                      value={Math.min(100, (vm.cpu || 0) * 100)}
                      colorClass="bg-gradient-to-r from-primary to-primary/80"
                    />
                    <CompactMeter
                      label="Memória"
                      value={Math.min(100, ((vm.mem || 0) / (vm.maxmem || 1)) * 100)}
                      colorClass="bg-gradient-to-r from-emerald-400 to-emerald-600"
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card className="glass-card border-0 bg-black/40">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>VMs (QEMU)</CardTitle>
              <p className="text-xs text-muted-foreground">{runningVms.length} online • {stoppedVms.length} offline</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {vms.length === 0 && !loading && <p className="text-sm text-muted-foreground">Nenhuma VM.</p>}

            {runningVms.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Online</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {runningVms.map(vm => {
                    const keyRunning = vm.status === "running"
                    const metricsKey = `vm-${vm.node}-${vm.vmid}-${timeframe}`
                    const chartData = metrics[metricsKey] || { cpu: [], mem: [], disk: [], net: [] }
                    return (
                      <VmCard
                        key={vm.id}
                        vm={vm}
                        keyRunning={keyRunning}
                        metricsKey={metricsKey}
                        chartData={chartData}
                        actionLoading={actionLoading}
                        handleAction={handleAction}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {stoppedVms.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Offline</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {stoppedVms.map(vm => {
                    const keyRunning = vm.status === "running"
                    const metricsKey = `vm-${vm.node}-${vm.vmid}-${timeframe}`
                    const chartData = metrics[metricsKey] || { cpu: [], mem: [], disk: [], net: [] }
                    return (
                      <VmCard
                        key={vm.id}
                        vm={vm}
                        keyRunning={keyRunning}
                        metricsKey={metricsKey}
                        chartData={chartData}
                        actionLoading={actionLoading}
                        handleAction={handleAction}
                      />
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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
  const gradientId = `grad-${label.replace(/\s+/g, "-").toLowerCase()}`
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.7} />
            <stop offset="95%" stopColor={color} stopOpacity={0.1} />
          </linearGradient>
        </defs>
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
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fillOpacity={1}
          fill={`url(#${gradientId})`}
          stackId="stack"
          name={label}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

const MultiMetricChart = ({
  data,
  keys,
  colors,
  domain,
}: {
  data: any[]
  keys: string[]
  colors?: string[]
  domain?: [number, number] | ["auto", "auto"]
}) => {
  if (!data || data.length === 0 || keys.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem dados</p>
  }
  const palette = colors || ["#F0003C", "#10b981", "#3b82f6", "#eab308", "#a855f7"]
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
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
        />
        {keys.slice(0, palette.length).map((key, idx) => {
          const color = palette[idx % palette.length]
          const gradientId = `grad-${key.replace(/\s+/g, "-").toLowerCase()}`
          return (
            <defs key={`def-${key}`}>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.7} />
                <stop offset="95%" stopColor={color} stopOpacity={0.1} />
              </linearGradient>
            </defs>
          )
        })}
        {keys.slice(0, palette.length).map((key, idx) => {
          const color = palette[idx % palette.length]
          const gradientId = `grad-${key.replace(/\s+/g, "-").toLowerCase()}`
          return (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              name={key}
              dot={false}
              isAnimationActive={false}
            />
          )
        })}
      </AreaChart>
    </ResponsiveContainer>
  )
}

const CompactMeter = ({ label, value, colorClass }: { label: string; value: number; colorClass: string }) => {
  return (
    <div className="space-y-1">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full meter-bar ${colorClass}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">{value.toFixed(1)}%</p>
    </div>
  )
}

const VmCard = ({
  vm,
  keyRunning,
  metricsKey,
  chartData,
  actionLoading,
  handleAction,
}: {
  vm: any
  keyRunning: boolean
  metricsKey: string
  chartData: any
  actionLoading: string | null
  handleAction: (type: "start" | "stop" | "reboot", kind: "vm", node: string, vmid: number | string) => void
}) => {
  return (
    <div className="rounded-lg border border-white/10 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-medium">{vm.name || vm.id}</p>
        <Badge variant={keyRunning ? "default" : "outline"} className={keyRunning ? "bg-emerald-500 text-white" : ""}>
          {keyRunning ? "online" : "offline"}
        </Badge>
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
      </div>
      {keyRunning && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="h-28 space-y-1">
            <p className="text-xs text-muted-foreground">CPU %</p>
            <MetricChart data={chartData.cpu} color="#F0003C" label="CPU %" domain={[0, 100]} />
          </div>
          <div className="h-28 space-y-1">
            <p className="text-xs text-muted-foreground">Mem %</p>
            <MetricChart data={chartData.mem} color="#3b82f6" label="Mem %" domain={[0, 100]} />
          </div>
          <div className="h-28 space-y-1">
            <p className="text-xs text-muted-foreground">Disco MB/s</p>
            <MetricChart data={chartData.disk} color="#8b5cf6" label="Disk MB/s" domain={["auto", "auto"]} />
          </div>
          <div className="h-28 space-y-1">
            <p className="text-xs text-muted-foreground">Rede MB/s</p>
            <MetricChart data={chartData.net} color="#10b981" label="Net MB/s" domain={[0, 200]} />
          </div>
        </div>
      )}
    </div>
  )
}
