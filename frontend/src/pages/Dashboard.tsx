import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Activity, HardDrive, Server, Wallet, TrendingUp, Clock, CheckCircle2, AlertCircle, XCircle,
} from "lucide-react"
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts"
import { hostApi, agencyApi, proxmoxApi, sshApi, rdpApi } from "@/services/api"

const tooltipStyle = {
  backgroundColor: "rgba(0,0,0,0.9)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  color: "#fff",
  fontSize: 12,
}

const CHART_COLORS = ["#F0003C", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"]
const fmtGB = (bytes?: number | null) => (bytes ? (bytes / 1e9).toFixed(1) : "0.0")
const eur = (n: number, currency = "€") =>
  `${(n ?? 0).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`

export default function Dashboard() {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState<{ latest: any; history: any[] } | null>(null)
  const [summary, setSummary] = useState<any>(null)
  const [cashflow, setCashflow] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [proxmoxOk, setProxmoxOk] = useState(false)
  const [proxmoxSummary, setProxmoxSummary] = useState<{ running: number; total: number } | null>(null)
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
        const [s, c, t] = await Promise.all([
          agencyApi.getSummary(),
          agencyApi.getCashflow(),
          agencyApi.listTransactions(),
        ])
        if (!cancelled) {
          setSummary(s)
          setCashflow(c)
          setTransactions(t)
        }
      } catch (e) {
        console.error("Failed to load agency data", e)
      }
      try {
        const resources = await proxmoxApi.getClusterResources()
        if (!cancelled) {
          const vms = (resources || []).filter((r: any) => r.type === "qemu" || r.type === "lxc")
          setProxmoxSummary({ running: vms.filter((r: any) => r.status === "running").length, total: vms.length })
          setProxmoxOk(true)
        }
      } catch {
        if (!cancelled) { setProxmoxOk(false); setProxmoxSummary(null) }
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
    const timer = setInterval(load, 10000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const latest = metrics?.latest
  const currency = summary?.currency || "€"

  const performanceData = useMemo(() => {
    const history = metrics?.history || []
    return history
      .filter((_: any, i: number) => i % 6 === 0)
      .map((s: any) => ({
        time: new Date(s.timestamp * 1000).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
        cpu: Math.round(s.cpu?.load ?? 0),
        memory: s.memory?.total ? Math.round((s.memory.used / s.memory.total) * 100) : 0,
        network: Number(((s.network?.aggregate?.rx_sec || 0) + (s.network?.aggregate?.tx_sec || 0)) / 1e6),
      }))
  }, [metrics])

  const diskData = useMemo(
    () => (latest?.diskUsage || []).map((d: any) => ({ name: `/dev/${d.name}`, value: Number(fmtGB(d.used)) })),
    [latest]
  )

  const totalServers = (sshCount?.total || 0) + (rdpCount?.total || 0)
  const activeSessions = (sshCount?.active || 0) + (rdpCount?.active || 0)
  const memPct = latest?.memory?.total ? Math.round((latest.memory.used / latest.memory.total) * 100) : 0

  const recentActivity = useMemo(() => {
    return [...transactions]
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map((t: any) => ({
        id: t.id,
        type: t.type === "Receita" ? "deployment" : "alert",
        status: t.type === "Receita" ? "success" : "warning",
        message: `${t.type} de ${eur(Math.abs(t.value), currency)}${t.projectName ? ` — ${t.projectName}` : ""}${t.notes ? ` (${t.notes})` : ""}`,
        timestamp: new Date(t.date).toLocaleDateString("pt-PT"),
      }))
  }, [transactions, currency])

  if (loading) return <div className="text-muted-foreground">A carregar dashboard…</div>

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-primary mb-4">
            INFRASTRUCTURE CONTROL SUITE
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-2">
            System <span className="text-muted-foreground">Overview</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Monitorize e controle toda a sua infraestrutura num painel unificado.
          </p>
        </div>

        <div className="flex gap-4">
          <Button variant="outline" className="border-white/10 hover:bg-white/5 hover:text-white" onClick={() => navigate("/monitoring")}>
            Monitoring
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_-5px_var(--primary)]" onClick={() => navigate("/agency")}>
            Ver Agência
          </Button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Servidores geridos"
          value={`${totalServers}`}
          change={`${activeSessions} sessão(ões) ativa(s)`}
          icon={<Server className="h-5 w-5 text-primary" />}
        />
        <StatCard
          title="CPU Load"
          value={`${Math.round(latest?.cpu?.load ?? 0)}%`}
          change={latest?.cpu?.temp ? `${latest.cpu.temp.toFixed(1)}°C` : "host local"}
          icon={<Activity className="h-5 w-5 text-green-500" />}
        />
        <StatCard
          title="Memory Usage"
          value={`${fmtGB(latest?.memory?.used)} GB`}
          change={`${fmtGB(latest?.memory?.total)} GB total (${memPct}%)`}
          icon={<HardDrive className="h-5 w-5 text-blue-500" />}
        />
        <StatCard
          title="Lucro do mês (Agência)"
          value={summary ? eur(summary.lucroMes, currency) : "—"}
          change={summary ? `Saldo total: ${eur(summary.saldoTotal, currency)}` : "sem dados"}
          trend={summary?.lucroMes >= 0 ? "up" : "down"}
          icon={<Wallet className="h-5 w-5 text-yellow-500" />}
        />
      </div>

      {/* Main Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Server Performance */}
        <Card className="col-span-full lg:col-span-2 glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Desempenho do host (última hora)</span>
              <Badge variant="outline" className="border-primary/50 text-primary">Live</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
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

        {/* System Health */}
        <Card className="col-span-full lg:col-span-1 bg-gradient-to-b from-primary/20 to-black/40 border border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <HealthItem
              label="Host Metrics"
              value={latest ? 100 : 0}
              status={latest ? "Online" : "Sem dados"}
              statusColor={latest ? "text-green-500" : "text-primary"}
              barColor={latest ? "bg-green-500" : "bg-primary"}
            />
            <HealthItem
              label="Proxmox"
              value={proxmoxOk ? 100 : 0}
              status={proxmoxOk ? `${proxmoxSummary?.running || 0}/${proxmoxSummary?.total || 0} a correr` : "Indisponível"}
              statusColor={proxmoxOk ? "text-green-500" : "text-yellow-500"}
              barColor={proxmoxOk ? "bg-green-500" : "bg-yellow-500"}
            />
            <HealthItem
              label="SSH"
              value={sshCount ? 100 : 0}
              status={sshCount ? `${sshCount.total} servidor(es)` : "Indisponível"}
              statusColor={sshCount ? "text-green-500" : "text-yellow-500"}
              barColor={sshCount ? "bg-green-500" : "bg-yellow-500"}
            />
            <HealthItem
              label="Agência"
              value={summary ? 100 : 0}
              status={summary ? "Sincronizada" : "Indisponível"}
              statusColor={summary ? "text-green-500" : "text-primary"}
              barColor={summary ? "bg-green-500" : "bg-primary"}
            />

            <div className="pt-4">
              <Button className="w-full bg-white/10 hover:bg-white/20 text-white border-0" onClick={() => navigate("/monitoring")}>
                View All Systems
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Disk usage distribution */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle>Utilização de disco</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {diskData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Sem dados de disco.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={diskData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }: any) => `${name}: ${value}GB`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {diskData.map((_: any, index: number) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${v} GB`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Agency cashflow */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle>Cashflow da Agência ({summary?.year || new Date().getFullYear()})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashflow}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" style={{ fontSize: 12 }} />
                  <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => eur(Number(v), currency)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                  <Bar dataKey="receita" fill="#10b981" radius={[4, 4, 0, 0]} name="Receita" />
                  <Bar dataKey="despesas" fill="#F0003C" radius={[4, 4, 0, 0]} name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Atividade Recente (Agência)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">Sem transações recentes.</p>
            )}
            {recentActivity.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  title,
  value,
  change,
  trend,
  icon,
}: {
  title: string
  value: string
  change: string
  trend?: "up" | "down"
  icon: React.ReactNode
}) {
  return (
    <Card className="glass-card border-0 hover:bg-white/5 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon}
        </div>
        <div className="space-y-1 mt-2">
          <div className="text-2xl font-bold">{value}</div>
          <div className="flex items-center gap-1 text-xs">
            {trend && (
              <TrendingUp
                className={`h-3 w-3 ${
                  trend === "up" ? "text-green-500" : "text-primary rotate-180"
                }`}
              />
            )}
            <span className="text-muted-foreground">{change}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function HealthItem({
  label,
  value,
  status,
  statusColor,
  barColor,
}: {
  label: string
  value: number
  status: string
  statusColor: string
  barColor: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className={statusColor}>{status}</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function ActivityItem({ activity }: { activity: any }) {
  const getIcon = (type: string) => {
    switch (type) {
      case "deployment":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "alert":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-primary" />
      default:
        return <Activity className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "border-green-500/20 bg-green-500/10"
      case "warning":
        return "border-yellow-500/20 bg-yellow-500/10"
      case "error":
        return "border-primary/20 bg-primary/10"
      default:
        return "border-blue-500/20 bg-blue-500/10"
    }
  }

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-lg border ${getStatusColor(
        activity.status
      )}`}
    >
      <div className="mt-0.5">{getIcon(activity.type)}</div>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{activity.message}</p>
        <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
      </div>
    </div>
  )
}
