import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, HardDrive, Server, Shield, TrendingUp, Clock, CheckCircle2, AlertCircle, XCircle } from "lucide-react"
import { ServerPerformanceChart } from "@/components/charts/ServerPerformanceChart"
import { ResourceDistributionChart } from "@/components/charts/ResourceDistributionChart"
import { RequestsBarChart } from "@/components/charts/RequestsBarChart"
import {
  generateServerPerformanceData,
  generateResourceDistributionData,
  generateRequestsData,
  generateRecentActivity,
} from "@/lib/mockData"

export default function Dashboard() {
  const performanceData = useMemo(() => generateServerPerformanceData(), [])
  const resourceData = useMemo(() => generateResourceDistributionData(), [])
  const requestsData = useMemo(() => generateRequestsData(), [])
  const activityData = useMemo(() => generateRecentActivity(), [])

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
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
          <Button variant="outline" className="border-white/10 hover:bg-white/5 hover:text-white">
            Documentation
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_-5px_var(--primary)]">
            Connect New Server
          </Button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Servers"
          value="12"
          change="+2 online"
          trend="up"
          icon={<Server className="h-5 w-5 text-primary" />}
        />
        <StatCard
          title="Total CPU Load"
          value="45%"
          change="-12% vs peak"
          trend="down"
          icon={<Activity className="h-5 w-5 text-green-500" />}
        />
        <StatCard
          title="Memory Usage"
          value="24.8 GB"
          change="64GB Total"
          icon={<HardDrive className="h-5 w-5 text-blue-500" />}
        />
        <StatCard
          title="Active Alerts"
          value="3"
          change="1 Critical"
          trend="up"
          icon={<Shield className="h-5 w-5 text-yellow-500" />}
        />
      </div>

      {/* Main Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Server Performance */}
        <Card className="col-span-full lg:col-span-2 glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Server Performance (24h)</span>
              <Badge variant="outline" className="border-primary/50 text-primary">
                Live
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ServerPerformanceChart data={performanceData} />
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
              label="Database Cluster"
              value={98}
              status="Healthy"
              statusColor="text-green-500"
              barColor="bg-green-500"
            />
            <HealthItem
              label="API Gateway"
              value={85}
              status="High Load"
              statusColor="text-yellow-500"
              barColor="bg-yellow-500"
            />
            <HealthItem
              label="Backup Service"
              value={100}
              status="Failed"
              statusColor="text-primary"
              barColor="bg-primary"
            />
            <HealthItem
              label="Cache Layer"
              value={92}
              status="Optimal"
              statusColor="text-green-500"
              barColor="bg-green-500"
            />

            <div className="pt-4">
              <Button className="w-full bg-white/10 hover:bg-white/20 text-white border-0">
                View All Systems
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Resource Distribution */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle>Resource Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResourceDistributionChart data={resourceData} />
            </div>
          </CardContent>
        </Card>

        {/* Weekly Requests */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle>Weekly Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <RequestsBarChart data={requestsData} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activityData.map((activity) => (
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
