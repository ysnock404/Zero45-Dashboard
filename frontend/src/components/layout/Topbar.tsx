import { Bell, Search, User, LogOut } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Breadcrumbs } from "./Breadcrumbs"
import { useAuthStore } from "@/stores/authStore"
import { useUIStore } from "@/stores/uiStore"

export function Topbar() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const toggleCommandPalette = useUIStore((state) => state.toggleCommandPalette)

  const handleLogout = () => {
    logout()
    navigate("/login")
  }
  return (
    <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl mb-4 md:mb-6 lg:mb-8 -mx-4 md:-mx-6 lg:-mx-8 -mt-4 md:-mt-6 lg:-mt-8 px-4 md:px-6 lg:px-8 py-4">
      <div className="flex items-center justify-between">
        <Breadcrumbs />

        <div className="flex items-center gap-4">
          {/* Search Button */}
          <Button
            variant="outline"
            className="border-white/10 hover:bg-white/5 text-muted-foreground"
            size="sm"
            onClick={toggleCommandPalette}
          >
            <Search className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="ml-2 hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-xs">
              ⌘K
            </kbd>
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="border-white/10 hover:bg-white/5 relative"
              >
                <Bell className="h-4 w-4" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-primary text-white text-xs">
                  3
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-black/95 border-white/10">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem className="hover:bg-white/5 cursor-pointer">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">Server alert</p>
                  <p className="text-xs text-muted-foreground">CPU usage above 80%</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-white/5 cursor-pointer">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">Database backup</p>
                  <p className="text-xs text-muted-foreground">Backup completed successfully</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-white/5 cursor-pointer">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">System update</p>
                  <p className="text-xs text-muted-foreground">New version available</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="border-white/10 hover:bg-white/5"
              >
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-black/95 border-white/10">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{user?.name || "User"}</p>
                  <p className="text-xs text-muted-foreground font-normal">{user?.email || ""}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem className="hover:bg-white/5 cursor-pointer">Profile</DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-white/5 cursor-pointer">Settings</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                className="hover:bg-white/5 cursor-pointer text-primary"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
