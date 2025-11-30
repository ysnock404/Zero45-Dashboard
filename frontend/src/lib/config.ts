export interface SSHServer {
  id: number
  name: string
  host: string
  port: number
  username: string
  status: "online" | "offline" | "connecting"
  lastConnected?: string
  tags?: string[]
}

export interface TerminalCommand {
  output: string[]
}

export interface Config {
  branding: {
    name: string
    tagline: string
    description: string
  }
  ssh: {
    servers: SSHServer[]
    terminalCommands: Record<string, TerminalCommand>
    terminalWelcome: {
      enabled: boolean
      banner: string[]
      motd: string
      prompt: {
        user: string
        hostname: string
        path: string
      }
    }
  }
  databases: {
    connections: any[]
  }
  monitoring: {
    services: any[]
  }
  dashboard: {
    stats: {
      activeServers: number
      cpuLoad: number
      memoryUsage: string
      memoryTotal: string
      activeAlerts: number
    }
  }
}

let configCache: Config | null = null

export async function loadConfig(): Promise<Config> {
  if (configCache) {
    return configCache
  }

  try {
    const response = await fetch("/config.json")
    if (!response.ok) {
      throw new Error("Failed to load config")
    }
    configCache = await response.json()
    return configCache!
  } catch (error) {
    console.error("Error loading config:", error)
    // Return default config as fallback
    return getDefaultConfig()
  }
}

export function getDefaultConfig(): Config {
  return {
    branding: {
      name: "ysnockserver",
      tagline: "Universal Infrastructure Control Dashboard",
      description: "Monitorize e controle toda a sua infraestrutura num painel unificado.",
    },
    ssh: {
      servers: [],
      terminalCommands: {},
      terminalWelcome: {
        enabled: true,
        banner: [
          "┌─────────────────────────────────────────────────┐",
          "│  ysnockserver SSH Terminal                     │",
          "└─────────────────────────────────────────────────┘",
        ],
        motd: "Welcome to Ubuntu 22.04 LTS",
        prompt: {
          user: "root",
          hostname: "ysnockserver",
          path: "~",
        },
      },
    },
    databases: {
      connections: [],
    },
    monitoring: {
      services: [],
    },
    dashboard: {
      stats: {
        activeServers: 0,
        cpuLoad: 0,
        memoryUsage: "0 GB",
        memoryTotal: "0 GB",
        activeAlerts: 0,
      },
    },
  }
}

// Hook para usar no React
import { useEffect, useState } from "react"

export function useConfig() {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    loadConfig()
      .then((cfg) => {
        setConfig(cfg)
        setLoading(false)
      })
      .catch((err) => {
        setError(err)
        setLoading(false)
      })
  }, [])

  return { config, loading, error }
}
