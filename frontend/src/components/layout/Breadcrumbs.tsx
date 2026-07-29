import { useLocation, Link } from "react-router-dom"
import { ChevronRight, Home } from "lucide-react"

const routeNames: Record<string, string> = {
  "/": "Dashboard",
  "/agency": "Agência",
  "/assistant": "Assistente",
  "/ssh": "SSH Terminal",
  "/rdp": "Remote Desktop",
  "/database": "Database",
  "/api": "API Testing",
  "/monitoring": "Monitoring",
  "/proxmox": "Proxmox",
  "/charts": "Charts",
  "/logs": "Logs",
  "/alerts": "Alerts",
  "/automation": "Automation",
  "/settings": "Settings",
}

export function Breadcrumbs() {
  const location = useLocation()
  const pathnames = location.pathname.split("/").filter((x) => x)

  return (
    <nav className="flex items-center space-x-2 text-sm min-w-0">
      <Link
        to="/"
        aria-label="Dashboard"
        className="flex items-center text-muted-foreground hover:text-white transition-colors shrink-0"
      >
        <Home className="h-4 w-4" />
      </Link>

      {pathnames.map((_, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`
        const isLast = index === pathnames.length - 1
        const name = routeNames[routeTo] || routeTo

        // On narrow screens only the current page is shown, so the topbar
        // controls always keep their space.
        return (
          <div
            key={routeTo}
            className={`items-center gap-2 min-w-0 ${isLast ? "flex" : "hidden sm:flex"}`}
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            {isLast ? (
              <span className="font-medium text-white truncate">{name}</span>
            ) : (
              <Link
                to={routeTo}
                className="text-muted-foreground hover:text-white transition-colors truncate"
              >
                {name}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
