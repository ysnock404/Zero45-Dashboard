import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface DataPoint {
  time: string
  cpu: number
  memory: number
  network: number
}

interface ServerPerformanceChartProps {
  data: DataPoint[]
}

export function ServerPerformanceChart({ data }: ServerPerformanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis
          dataKey="time"
          stroke="rgba(255,255,255,0.5)"
          style={{ fontSize: 12 }}
        />
        <YAxis
          stroke="rgba(255,255,255,0.5)"
          style={{ fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(0,0,0,0.9)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "rgba(255,255,255,0.7)" }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          iconType="circle"
        />
        <Line
          type="monotone"
          dataKey="cpu"
          stroke="#F0003C"
          strokeWidth={2}
          dot={false}
          name="CPU %"
        />
        <Line
          type="monotone"
          dataKey="memory"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          name="Memory %"
        />
        <Line
          type="monotone"
          dataKey="network"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
          name="Network MB/s"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
