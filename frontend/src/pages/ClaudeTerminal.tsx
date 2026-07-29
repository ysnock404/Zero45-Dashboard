import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bot, Maximize2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ClaudeXTerm } from "@/components/claude-terminal/ClaudeXTerm"

export default function ClaudeTerminal() {
  const { toast } = useToast()
  const [isConnected, setIsConnected] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  return (
    <div className="space-y-6 md:space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-2">Assistente</h1>
        <p className="text-muted-foreground text-lg">
          Fala diretamente com o Claude Code. Sessão contínua, com memória entre visitas.
        </p>
      </header>

      <Card className={`glass-card border-0 bg-black/90 transition-all ${isFullscreen ? 'fixed inset-2 sm:inset-4 z-50 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Claude
              {isConnected && (
                <Badge variant="outline" className="border-green-500/50 text-green-500">
                  Ligado
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="icon"
              className="border-white/10 hover:bg-white/5"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ClaudeXTerm
            onConnected={() => setIsConnected(true)}
            onError={(error) => {
              setIsConnected(false)
              toast({
                title: "Erro de ligação",
                description: error,
                variant: "destructive",
              })
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
