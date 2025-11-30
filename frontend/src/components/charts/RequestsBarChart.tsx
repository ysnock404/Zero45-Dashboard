import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface DataPoint {
  name: string
  requests: number
  errors: number
}

interface RequestsBarChartProps {
  data: DataPoint[]
}

export function RequestsBarChart({ data }: RequestsBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis
          dataKey="name"
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
        <Bar dataKey="requests" fill="#10b981" radius={[4, 4, 0, 0]} name="Requests" />
        <Bar dataKey="errors" fill="#F0003C" radius={[4, 4, 0, 0]} name="Errors" />
      </BarChart>
    </ResponsiveContainer>
  )
}
