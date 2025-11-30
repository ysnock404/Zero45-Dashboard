import { NavLink } from "react-router-dom"
import { LayoutDashboard, Terminal, Database, Activity, BarChart3, FileText, Bell, Workflow, Settings, Zap } from "lucide-react"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Terminal, label: "SSH Terminal", path: "/ssh" },
  { icon: Database, label: "Databases", path: "/database" },
  { icon: Activity, label: "Monitoring", path: "/monitoring" },
  { icon: BarChart3, label: "Charts", path: "/charts" },
  { icon: FileText, label: "Logs", path: "/logs" },
  { icon: Bell, label: "Alerts", path: "/alerts" },
  { icon: Workflow, label: "Automation", path: "/automation" },
  { icon: Settings, label: "Settings", path: "/settings" },
]

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-white/10 bg-black/40 backdrop-blur-xl hidden md:flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/50">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight">ysnockserver</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="glass p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-600" />
            <div>
              <p className="text-sm font-medium">Admin User</p>
              <p className="text-xs text-muted-foreground">admin@ysnockserver.local</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
