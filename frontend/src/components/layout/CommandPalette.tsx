import { useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  LayoutDashboard,
  Terminal,
  Database,
  Activity,
  BarChart3,
  FileText,
  Bell,
  Workflow,
  Settings,
  Search,
  LogOut,
  User,
} from "lucide-react"
import { useAuthStore } from "@/stores/authStore"
import { useUIStore } from "@/stores/uiStore"

export function CommandPalette() {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const { commandPaletteOpen, setCommandPaletteOpen, toggleCommandPalette } = useUIStore()

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        toggleCommandPalette()
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [toggleCommandPalette])

  const runCommand = useCallback((command: () => void) => {
    setCommandPaletteOpen(false)
    command()
  }, [setCommandPaletteOpen])

  const pages = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/",
      keywords: ["home", "overview", "dashboard"],
    },
    {
      name: "SSH Terminal",
      icon: Terminal,
      path: "/ssh",
      keywords: ["ssh", "terminal", "shell", "server", "remote"],
    },
    {
      name: "Database",
      icon: Database,
      path: "/database",
      keywords: ["database", "db", "sql", "query", "postgres", "mysql"],
    },
    {
      name: "API Testing",
      icon: Search,
      path: "/api",
      keywords: ["api", "rest", "http", "request", "postman"],
    },
    {
      name: "Monitoring",
      icon: Activity,
      path: "/monitoring",
      keywords: ["monitoring", "health", "uptime", "status"],
    },
    {
      name: "Charts & Analytics",
      icon: BarChart3,
      path: "/charts",
      keywords: ["charts", "analytics", "graphs", "visualization"],
    },
    {
      name: "Logs",
      icon: FileText,
      path: "/logs",
      keywords: ["logs", "logging", "errors", "debug"],
    },
    {
      name: "Alerts",
      icon: Bell,
      path: "/alerts",
      keywords: ["alerts", "notifications", "alarms", "warnings"],
    },
    {
      name: "Automation",
      icon: Workflow,
      path: "/automation",
      keywords: ["automation", "workflows", "cron", "scheduled"],
    },
    {
      name: "Settings",
      icon: Settings,
      path: "/settings",
      keywords: ["settings", "preferences", "configuration"],
    },
  ]

  const actions = [
    {
      name: "Profile",
      icon: User,
      action: () => navigate("/settings"),
      keywords: ["profile", "account", "user"],
    },
    {
      name: "Logout",
      icon: LogOut,
      action: () => {
        logout()
        navigate("/login")
      },
      keywords: ["logout", "sign out", "exit"],
    },
  ]

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Pages">
          {pages.map((page) => (
            <CommandItem
              key={page.path}
              onSelect={() => runCommand(() => navigate(page.path))}
              keywords={page.keywords}
            >
              <page.icon className="mr-2 h-4 w-4" />
              <span>{page.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          {actions.map((action) => (
            <CommandItem
              key={action.name}
              onSelect={() => runCommand(action.action)}
              keywords={action.keywords}
            >
              <action.icon className="mr-2 h-4 w-4" />
              <span>{action.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
