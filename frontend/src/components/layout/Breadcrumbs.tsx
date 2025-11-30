import { useLocation, Link } from "react-router-dom"
import { ChevronRight, Home } from "lucide-react"

const routeNames: Record<string, string> = {
  "/": "Dashboard",
  "/ssh": "SSH Terminal",
  "/database": "Database",
  "/api": "API Testing",
  "/monitoring": "Monitoring",
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
    <nav className="flex items-center space-x-2 text-sm">
      <Link
        to="/"
        className="flex items-center text-muted-foreground hover:text-white transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {pathnames.map((_, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`
        const isLast = index === pathnames.length - 1
        const name = routeNames[routeTo] || routeTo

        return (
          <div key={routeTo} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            {isLast ? (
              <span className="font-medium text-white">{name}</span>
            ) : (
              <Link
                to={routeTo}
                className="text-muted-foreground hover:text-white transition-colors"
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
