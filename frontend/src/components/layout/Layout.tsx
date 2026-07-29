import { useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Sidebar, MobileSidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { CommandPalette } from "./CommandPalette"
import { useUIStore } from "@/stores/uiStore"

export function Layout() {
  const location = useLocation()
  const { mobileNavOpen, setMobileNavOpen } = useUIStore()

  // Close the drawer on navigation so the nav never covers the new page.
  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname, setMobileNavOpen])

  // Escape closes the drawer; lock body scroll while it is open.
  useEffect(() => {
    if (!mobileNavOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [mobileNavOpen, setMobileNavOpen])

  return (
    <div className="flex h-[100dvh] overflow-hidden font-sans text-foreground">
      <Sidebar />
      <MobileSidebar />
      {/* Sem padding no topo: a Topbar é sticky e sangra até às bordas, por
          isso é ela que define o espaçamento superior. Um `pt` aqui deixaria
          uma faixa vazia por cima dela ao fazer scroll. */}
      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 md:px-6 lg:px-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Topbar />
        <Outlet />
      </main>
      <CommandPalette />
    </div>
  )
}
