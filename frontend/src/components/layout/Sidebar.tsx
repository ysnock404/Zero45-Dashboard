import { NavLink } from "react-router-dom"
import { LayoutDashboard, Terminal, Monitor, Database, Activity, BarChart3, FileText, Bell, Workflow, Settings, Zap, Server, Wallet, Bot } from "lucide-react"
import { useAuthStore } from "@/stores/authStore"
import { useUIStore } from "@/stores/uiStore"

export const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Wallet, label: "Agência", path: "/agency" },
  { icon: Bot, label: "Assistente", path: "/assistant" },
  { icon: Terminal, label: "SSH Terminal", path: "/ssh" },
  { icon: Monitor, label: "Remote Desktop", path: "/rdp" },
  { icon: Database, label: "Databases", path: "/database" },
  { icon: Activity, label: "Monitoring", path: "/monitoring" },
  { icon: Server, label: "Proxmox", path: "/proxmox" },
  { icon: BarChart3, label: "Charts", path: "/charts" },
  { icon: FileText, label: "Logs", path: "/logs" },
  { icon: Bell, label: "Alerts", path: "/alerts" },
  { icon: Workflow, label: "Automation", path: "/automation" },
  { icon: Settings, label: "Settings", path: "/settings" },
]

/**
 * Shared nav body. Rendered both in the desktop rail and inside the mobile
 * drawer, so the two can never drift apart.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuthStore((state) => state.user)

  return (
    <>
      <div className="p-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/50 shrink-0">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <span className="text-l font-bold tracking-tight">Zero45 Dashboard</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto overscroll-contain">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${isActive
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="glass p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || "Admin User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.username || ""}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export function Sidebar() {
  return (
    <aside className="w-64 shrink-0 border-r border-white/10 bg-black/40 backdrop-blur-xl hidden md:flex flex-col">
      <SidebarNav />
    </aside>
  )
}

/** Off-canvas drawer used below the `md` breakpoint. */
export function MobileSidebar() {
  const { mobileNavOpen, setMobileNavOpen } = useUIStore()

  return (
    <div className="md:hidden" aria-hidden={!mobileNavOpen}>
      {/* Scrim */}
      <div
        onClick={() => setMobileNavOpen(false)}
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
          mobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(17rem,85vw)] flex-col border-r border-white/10 bg-black/95 backdrop-blur-xl transition-transform duration-200 ease-out pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
      </aside>
    </div>
  )
}
