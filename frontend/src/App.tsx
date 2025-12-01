import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Layout } from "@/components/layout/Layout"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import Dashboard from "@/pages/Dashboard"
import SSH from "@/pages/SSH"
import RDP from "@/pages/RDP"
import Database from "@/pages/Database"
import API from "@/pages/API"
import Monitoring from "@/pages/Monitoring"
import Charts from "@/pages/Charts"
import Logs from "@/pages/Logs"
import Alerts from "@/pages/Alerts"
import Automation from "@/pages/Automation"
import Settings from "@/pages/Settings"
import Proxmox from "@/pages/Proxmox"
import Login from "@/pages/Login"
import NotFound from "@/pages/NotFound"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="ssh" element={<SSH />} />
          <Route path="rdp" element={<RDP />} />
          <Route path="database" element={<Database />} />
          <Route path="api" element={<API />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="proxmox" element={<Proxmox />} />
          <Route path="charts" element={<Charts />} />
          <Route path="logs" element={<Logs />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="automation" element={<Automation />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
