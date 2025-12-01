import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { CommandPalette } from "./CommandPalette"

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden font-sans text-foreground">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
        <Topbar />
        <Outlet />
      </main>
      <CommandPalette />
    </div>
  )
}
