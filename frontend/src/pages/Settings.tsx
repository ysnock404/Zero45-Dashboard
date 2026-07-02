import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { KeyRound, Loader2 } from "lucide-react"
import { authApi } from "@/services/api"

export default function Settings() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (newPassword.length < 8) {
      setError("A nova password deve ter pelo menos 8 caracteres.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("As passwords não coincidem.")
      return
    }

    setLoading(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      setSuccess("Password alterada com sucesso.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      setError(err?.response?.data?.message || "Não foi possível alterar a password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          Settings & <span className="text-muted-foreground">Preferences</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Configurar a aplicação e a sua conta.
        </p>
      </header>

      <div className="glass-card p-8 rounded-lg border border-white/10 bg-black/40 max-w-md">
        <div className="flex items-center gap-2 mb-6">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Alterar Password</h2>
        </div>

        {error && (
          <Alert className="mb-4 bg-primary/10 border-primary/50 text-white">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-4 bg-green-500/10 border-green-500/50 text-white">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Password atual</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="bg-white/5 border-white/10 focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="bg-white/5 border-white/10 focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar nova password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="bg-white/5 border-white/10 focus:border-primary"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-white"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A alterar...
              </>
            ) : (
              "Alterar Password"
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
