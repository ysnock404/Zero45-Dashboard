// Generate mock data for charts
export function generateServerPerformanceData() {
  const data = []
  const now = new Date()

  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000)
    data.push({
      time: time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      cpu: Math.floor(Math.random() * 40) + 30, // 30-70%
      memory: Math.floor(Math.random() * 30) + 50, // 50-80%
      network: Math.floor(Math.random() * 50) + 10, // 10-60 MB/s
    })
  }

  return data
}

export function generateResourceDistributionData() {
  return [
    { name: "Web Servers", value: 35 },
    { name: "Databases", value: 25 },
    { name: "Cache", value: 15 },
    { name: "Queue Workers", value: 12 },
    { name: "API Gateway", value: 8 },
    { name: "Other", value: 5 },
  ]
}

export function generateRequestsData() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  return days.map((day) => ({
    name: day,
    requests: Math.floor(Math.random() * 5000) + 3000,
    errors: Math.floor(Math.random() * 100) + 10,
  }))
}

export function generateRecentActivity() {
  const activities = [
    {
      id: 1,
      type: "deployment",
      message: "Deployed v2.1.0 to production",
      timestamp: "2 minutes ago",
      status: "success",
    },
    {
      id: 2,
      type: "alert",
      message: "High CPU usage on web-server-03",
      timestamp: "15 minutes ago",
      status: "warning",
    },
    {
      id: 3,
      type: "backup",
      message: "Database backup completed",
      timestamp: "1 hour ago",
      status: "success",
    },
    {
      id: 4,
      type: "error",
      message: "Failed to connect to cache cluster",
      timestamp: "2 hours ago",
      status: "error",
    },
    {
      id: 5,
      type: "scaling",
      message: "Auto-scaled web servers from 3 to 5",
      timestamp: "3 hours ago",
      status: "info",
    },
  ]

  return activities
}
