import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Cpu, MemoryStick, Gauge, Zap, Server, HardDrive, Network, Terminal, MonitorSmartphone,
} from "lucide-react"
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts"
import { hostApi, proxmoxApi, sshApi, rdpApi } from "@/services/api"

const tooltipStyle = {
  backgroundColor: "rgba(0,0,0,0.9)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  color: "#fff",
  fontSize: 12,
}

const fmtGB = (bytes?: number | null) => (bytes ? (bytes / 1e9).toFixed(1) : "0.0")
const fmtMB = (bytesPerSec?: number | null) => (bytesPerSec ? (bytesPerSec / 1e6).toFixed(2) : "0.00")

export default function Monitoring() {
  const [metrics, setMetrics] = useState<{ latest: any; history: any[] } | null>(null)
  const [proxmoxSummary, setProxmoxSummary] = useState<{ running: number; stopped: number; nodes: number } | null>(null)
  const [sshCount, setSshCount] = useState<{ total: number; active: number } | null>(null)
  const [rdpCount, setRdpCount] = useState<{ total: number; active: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const data = await hostApi.getMetrics()
        if (!cancelled) setMetrics(data)
      } catch (e) {
        console.error("Failed to load host metrics", e)
      }
      try {
        const resources = await proxmoxApi.getClusterResources()
        if (!cancelled) {
          const vms = (resources || []).filter((r: any) => r.type === "qemu" || r.type === "lxc")
          setProxmoxSummary({
            running: vms.filter((r: any) => r.status === "running").length,
            stopped: vms.filter((r: any) => r.status !== "running").length,
            nodes: (resources || []).filter((r: any) => r.type === "node").length,
          })
        }
      } catch {
        if (!cancelled) setProxmoxSummary(null)
      }
      try {
        const [servers, sessions] = await Promise.all([sshApi.getServers(), sshApi.getActiveSessions()])
        if (!cancelled) setSshCount({ total: (servers || []).length, active: (sessions || []).length })
      } catch {
        if (!cancelled) setSshCount(null)
      }
      try {
        const [servers, sessions] = await Promise.all([rdpApi.getServers(), rdpApi.getActiveSessions()])
        if (!cancelled) setRdpCount({ total: (servers || []).length, active: (sessions || []).length })
      } catch {
        if (!cancelled) setRdpCount(null)
      }
      if (!cancelled) setLoading(false)
    }

    load()
    const timer = setInterval(load, 5000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const latest = metrics?.latest

  const chartData = useMemo(() => {
    const history = metrics?.history || []
    return history
      .filter((_: any, i: number) => i % 6 === 0) // ~30s buckets
      .map((s: any) => ({
        time: new Date(s.timestamp * 1000).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
        cpu: Math.round(s.cpu?.load ?? 0),
        memory: s.memory?.total ? Math.round((s.memory.used / s.memory.total) * 100) : 0,
        network: Number(((s.network?.aggregate?.rx_sec || 0) + (s.network?.aggregate?.tx_sec || 0)) / 1e6).toFixed(2),
      }))
  }, [metrics])

  const memPct = latest?.memory?.total ? Math.round((latest.memory.used / latest.memory.total) * 100) : 0

  if (loading) return <div className="text-muted-foreground">A carregar monitorização…</div>

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Service <span className="text-muted-foreground">Monitoring</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Monitorização em tempo real do host e dos serviços ligados.
          </p>
        </div>
        <Badge variant="outline" className="border-primary/50 text-primary">
          Atualiza a cada 5s
        </Badge>
      </header>

      {/* Stats grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="CPU Load"
          value={`${Math.round(latest?.cpu?.load ?? 0)}%`}
          sub={latest?.cpu?.temp ? `${latest.cpu.temp.toFixed(1)}°C` : "temp indisponível"}
          icon={<Cpu className="h-5 w-5 text-primary" />}
        />
        <StatCard
          title="Memory"
          value={`${fmtGB(latest?.memory?.used)} GB`}
          sub={`${fmtGB(latest?.memory?.total)} GB total (${memPct}%)`}
          icon={<MemoryStick className="h-5 w-5 text-blue-500" />}
        />
        <StatCard
          title="Power Draw"
          value={latest?.power?.watts != null ? `${latest.power.watts.toFixed(0)} W` : "N/D"}
          sub="Consumo estimado do host"
          icon={<Zap className="h-5 w-5 text-yellow-500" />}
        />
        <StatCard
          title="Network I/O"
          value={`${fmtMB((latest?.network?.aggregate?.rx_sec || 0) + (latest?.network?.aggregate?.tx_sec || 0))} MB/s`}
          sub="RX + TX agregado"
          icon={<Network className="h-5 w-5 text-green-500" />}
        />
      </div>

      {/* Performance chart */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Desempenho do host (última hora)</span>
            <Badge variant="outline" className="border-primary/50 text-primary">Live</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" style={{ fontSize: 12 }} />
                <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                <Line type="monotone" dataKey="cpu" stroke="#F0003C" strokeWidth={2} dot={false} name="CPU %" />
                <Line type="monotone" dataKey="memory" stroke="#3b82f6" strokeWidth={2} dot={false} name="Memory %" />
                <Line type="monotone" dataKey="network" stroke="#10b981" strokeWidth={2} dot={false} name="Network MB/s" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Disk usage */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" /> Utilização de disco
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(latest?.diskUsage || []).length === 0 && (
              <p className="text-muted-foreground text-sm">Sem dados de disco disponíveis.</p>
            )}
            {(latest?.diskUsage || []).map((d: any) => (
              <div key={d.name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>/dev/{d.name}</span>
                  <span className="text-muted-foreground">
                    {fmtGB(d.used)} / {fmtGB(d.size)} GB{d.usePct != null ? ` (${d.usePct.toFixed(0)}%)` : ""}
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${(d.usePct || 0) > 85 ? "bg-primary" : (d.usePct || 0) > 65 ? "bg-yellow-500" : "bg-green-500"}`}
                    style={{ width: `${Math.min(100, d.usePct || 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Connected services */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" /> Serviços ligados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ServiceRow
              icon={<Server className="h-4 w-4 text-primary" />}
              label="Proxmox"
              detail={proxmoxSummary ? `${proxmoxSummary.nodes} node(s) · ${proxmoxSummary.running} a correr · ${proxmoxSummary.stopped} parado(s)` : "Indisponível"}
              ok={!!proxmoxSummary}
            />
            <ServiceRow
              icon={<Terminal className="h-4 w-4 text-blue-500" />}
              label="SSH"
              detail={sshCount ? `${sshCount.total} servidor(es) · ${sshCount.active} sessão(ões) ativa(s)` : "Indisponível"}
              ok={!!sshCount}
            />
            <ServiceRow
              icon={<MonitorSmartphone className="h-4 w-4 text-green-500" />}
              label="RDP"
              detail={rdpCount ? `${rdpCount.total} servidor(es) · ${rdpCount.active} sessão(ões) ativa(s)` : "Indisponível"}
              ok={!!rdpCount}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ title, value, sub, icon }: { title: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <Card className="glass-card border-0 hover:bg-white/5 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon}
        </div>
        <div className="space-y-1 mt-2">
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ServiceRow({ icon, label, detail, ok }: { icon: React.ReactNode; label: string; detail: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{detail}</span>
        <span className={`h-2 w-2 rounded-full ${ok ? "bg-green-500" : "bg-white/20"}`} />
      </div>
    </div>
  )
}
