import { Fragment, useEffect, useMemo, useRef, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Wallet, Plus, Trash2, Edit, Download, Send, Bot, ScrollText,
  Briefcase, Receipt, Settings as SettingsIcon, Filter, X,
} from "lucide-react"
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area, PieChart, Pie, Cell, BarChart,
} from "recharts"
import { useToast } from "@/hooks/use-toast"
import { agencyApi } from "@/services/api"
import { useIsMobile } from "@/hooks/use-media-query"
import { KpiStrip } from "./agency/KpiStrip"
import { eurCompact } from "./agency/format"

// ---------- constantes (espelham a sheet de Config) ----------
const TIPOS = ["Receita", "Despesa"]
const RECORRENCIAS = ["Único", "Diário", "Semanal", "Mensal", "Anual", "Contínuo"]
const MODELOS = ["Hora", "Diário", "Semanal", "Mensal", "Anual", "Único"]
const ESTADOS = ["Pago", "Pendente", "Previsto"]
const CHART_COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6", "#eab308"]

const eur = (n: number, currency = "€") =>
  `${(n ?? 0).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`

// Tooltip custom partilhado pelos gráficos: mais fiável que o `formatter` do
// recharts (que em v3 fica em branco em alguns charts, ex. Pie) e fica mais bonito.
function ChartTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-black/90 backdrop-blur-md px-3 py-2 shadow-2xl min-w-[140px]">
      {label && <div className="text-xs font-medium text-white/80 mb-1.5">{label}</div>}
      <div className="space-y-1">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color || p.payload?.fill }} />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="font-semibold text-white ml-auto tabular-nums">{eur(Number(p.value), currency)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===================================================================
export default function Agency() {
  const { toast } = useToast()
  const [year] = useState(new Date().getFullYear())
  const [summary, setSummary] = useState<any>(null)
  const [cashflow, setCashflow] = useState<any[]>([])
  const [forecast, setForecast] = useState<any>(null)
  const [reports, setReports] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  const currency = summary?.currency || "€"
  const categories = useMemo(
    () => Array.from(new Set(transactions.map((t: any) => t.category).filter(Boolean))).sort(),
    [transactions]
  )

  const loadAll = useCallback(async () => {
    try {
      const [s, c, f, r, p, t] = await Promise.all([
        agencyApi.getSummary(year), agencyApi.getCashflow(year), agencyApi.getForecast(12),
        agencyApi.getReports(), agencyApi.listProjects(), agencyApi.listTransactions(),
      ])
      setSummary(s); setCashflow(c); setForecast(f); setReports(r); setProjects(p); setTransactions(t)
    } catch (e: any) {
      toast({ title: "Erro a carregar", description: e?.message || "Falha na API", variant: "destructive" })
    } finally { setLoading(false) }
  }, [year, toast])

  useEffect(() => { loadAll() }, [loadAll])

  const handleExport = async () => {
    const blob = await agencyApi.exportCSV()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "transacoes-agencia.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="text-muted-foreground">A carregar dashboard da agência…</div>

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap justify-between items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Agência <span className="text-muted-foreground font-normal">· Cashflow</span>
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          <Button className="flex-1 sm:flex-none bg-primary hover:bg-primary/90" onClick={() => setQuickAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nova transação
          </Button>
          <Button variant="outline" className="flex-1 sm:flex-none border-white/10 hover:bg-white/5 hover:text-white" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
        </div>
      </header>

      <TransactionDialog
        open={quickAddOpen} setOpen={setQuickAddOpen} editing={null}
        projects={projects} reload={loadAll} categories={categories}
      />

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="bg-black/40 border border-white/10">
          <TabsTrigger value="overview"><Wallet className="h-4 w-4 mr-2" />Overview</TabsTrigger>
          <TabsTrigger value="transactions"><Receipt className="h-4 w-4 mr-2" />Transações</TabsTrigger>
          <TabsTrigger value="projects"><Briefcase className="h-4 w-4 mr-2" />Projetos</TabsTrigger>
          <TabsTrigger value="config"><SettingsIcon className="h-4 w-4 mr-2" />Configuração</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <OverviewTab summary={summary} cashflow={cashflow} forecast={forecast} reports={reports} currency={currency} />
        </TabsContent>
        <TabsContent value="transactions">
          <TransactionsTab transactions={transactions} projects={projects} currency={currency} reload={loadAll} categories={categories} />
        </TabsContent>
        <TabsContent value="projects">
          <ProjectsTab projects={projects} currency={currency} reload={loadAll} />
        </TabsContent>
        <TabsContent value="config">
          <ConfigTab reload={loadAll} />
        </TabsContent>
      </Tabs>

      <AssistantWidget reload={loadAll} />
    </div>
  )
}

// ===================================================================
// OVERVIEW
// ===================================================================
function OverviewTab({ summary, cashflow, forecast, reports, currency }: any) {
  const s = summary
  const axisTick = { fill: "#8a8a93", fontSize: 11 }
  const receitaPorProjeto = reports?.receitaPorProjeto || []
  const totalReceitaProjetos = receitaPorProjeto.reduce((a: number, p: any) => a + (p.value || 0), 0)

  return (
    <div className="space-y-5">
      <KpiStrip summary={s} currency={currency} />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="glass-card border-0 lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Cashflow mensal real ({s.year})</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={cashflow} barGap={4} barCategoryGap="28%">
                <defs>
                  <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.55} />
                  </linearGradient>
                  <linearGradient id="gradDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => eurCompact(v, currency)} width={54} />
                <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                <Bar dataKey="receita" name="Receita" fill="url(#gradReceita)" radius={[5, 5, 0, 0]} maxBarSize={28} />
                <Bar dataKey="despesas" name="Despesas" fill="url(#gradDespesas)" radius={[5, 5, 0, 0]} maxBarSize={28} />
                <Line type="monotone" dataKey="lucro" name="Lucro" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardHeader className="pb-2"><CardTitle className="text-base">Saldo acumulado</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={cashflow}>
                <defs>
                  <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => eurCompact(v, currency)} width={54} />
                <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ stroke: "rgba(255,255,255,0.15)" }} />
                <Area type="monotone" dataKey="acumulado" name="Saldo" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gradSaldo)" dot={false} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="glass-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Projeção — próximos 12 meses</CardTitle>
            <p className="text-xs text-muted-foreground">Saldo acumulado se mantiveres o ritmo atual de projetos e despesas recorrentes.</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={forecast?.series || []}>
                <defs>
                  <linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="month" tick={{ ...axisTick, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => eurCompact(v, currency)} width={50} />
                <Tooltip
                  content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null
                    const p = payload[0].payload
                    return (
                      <div className="rounded-xl border border-white/10 bg-black/90 backdrop-blur-md px-3 py-2 shadow-2xl min-w-[150px]">
                        <div className="text-xs font-medium text-white/80 mb-1.5">{label}</div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                          <span className="text-muted-foreground">Saldo projetado</span>
                          <span className="font-semibold text-white ml-auto tabular-nums">{eur(p.acumulado, currency)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs mt-1">
                          <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                          <span className="text-muted-foreground">Lucro do mês</span>
                          <span className="font-semibold text-white ml-auto tabular-nums">{eur(p.lucro, currency)}</span>
                        </div>
                      </div>
                    )
                  }}
                  cursor={{ stroke: "rgba(255,255,255,0.15)" }}
                />
                <Area type="monotone" dataKey="acumulado" name="Saldo projetado" stroke="#22c55e" strokeWidth={2.5} fill="url(#gradForecast)" activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardHeader className="pb-2"><CardTitle className="text-base">Receita por projeto</CardTitle></CardHeader>
          <CardContent>
            <div className="relative">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={receitaPorProjeto} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={52} outerRadius={80}
                    paddingAngle={2} cornerRadius={4}
                  >
                    {receitaPorProjeto.map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="rgba(0,0,0,0.4)" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip currency={currency} />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" layout="horizontal" verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
              {totalReceitaProjetos > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ bottom: "18%" }}>
                  <div className="text-center">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</div>
                    <div className="text-sm font-bold tabular-nums">{eurCompact(totalReceitaProjetos, currency)}</div>
                  </div>
                </div>
              )}
              {receitaPorProjeto.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Sem dados.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardHeader className="pb-2"><CardTitle className="text-base">Despesa por categoria</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={reports?.despesaPorCategoria || []} layout="vertical">
                <defs>
                  <linearGradient id="gradDespesaCat" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => eurCompact(v, currency)} />
                <YAxis type="category" dataKey="name" tick={axisTick} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="value" name="Despesa" fill="url(#gradDespesaCat)" radius={[0, 5, 5, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ===================================================================
// DIALOG DE TRANSAÇÃO (partilhado: header + tab de transações)
// ===================================================================
const emptyTx = { date: new Date().toISOString().slice(0, 10), projectId: "", client: "", type: "Despesa", category: "", value: "", status: "Pago", recurrence: "Único", notes: "" }
const NEW_CATEGORY = "__new__"

function TransactionDialog({ open, setOpen, editing, projects, reload, categories = [] }: any) {
  const { toast } = useToast()
  const [form, setForm] = useState<any>(emptyTx)
  const [newCategory, setNewCategory] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({ date: new Date(editing.date).toISOString().slice(0, 10), projectId: editing.projectId || "", client: editing.client || "", type: editing.type, category: editing.category || "", value: Math.abs(editing.value), status: editing.status, recurrence: editing.recurrence, notes: editing.notes || "" })
      setNewCategory(!!editing.category && !categories.includes(editing.category))
    } else {
      setForm({ ...emptyTx, date: new Date().toISOString().slice(0, 10) })
      setNewCategory(false)
    }
  }, [open, editing])

  const save = async () => {
    if (!form.value || !form.date) { toast({ title: "Preenche data e valor", variant: "destructive" }); return }
    try {
      const payload = { ...form, projectId: form.projectId || null, value: Number(form.value) }
      if (editing) await agencyApi.updateTransaction(editing.id, payload)
      else await agencyApi.createTransaction(payload)
      toast({ title: editing ? "Transação atualizada" : "Transação criada" })
      setOpen(false); reload()
    } catch (e: any) { toast({ title: "Erro", description: e?.message, variant: "destructive" }) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-black/90 border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar transação" : "Nova transação"}</DialogTitle>
          <DialogDescription>Valores de despesa são guardados como negativos automaticamente.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Data"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="bg-black/50 border-white/10" /></Field>
          <Field label="Valor"><Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="bg-black/50 border-white/10" /></Field>
          <Field label="Tipo"><FormSelect value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={TIPOS} /></Field>
          <Field label="Estado"><FormSelect value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={ESTADOS} /></Field>
          <Field label="Projeto"><FormSelect value={form.projectId} onChange={(v) => setForm({ ...form, projectId: v })} options={[{ label: "— Nenhum —", value: "" }, ...projects.map((p: any) => ({ label: p.name, value: p.id }))]} /></Field>
          <Field label="Cliente"><Input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} className="bg-black/50 border-white/10" /></Field>
          <Field label="Categoria">
            {newCategory || categories.length === 0 ? (
              <div className="flex gap-1.5">
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-black/50 border-white/10" placeholder="Domínio, Subscrição…" autoFocus={categories.length > 0} />
                {categories.length > 0 && (
                  <Button type="button" variant="outline" size="sm" className="border-white/10 shrink-0" onClick={() => { setNewCategory(false); setForm({ ...form, category: "" }) }}>Cancelar</Button>
                )}
              </div>
            ) : (
              <Select
                value={form.category || NONE}
                onValueChange={(v) => v === NEW_CATEGORY ? setNewCategory(true) : setForm({ ...form, category: v === NONE ? "" : v })}
              >
                <SelectTrigger className="bg-black/50 border-white/10"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent className="bg-black/90 border-white/10">
                  <SelectItem value={NONE}>— Nenhuma —</SelectItem>
                  {categories.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  <SelectItem value={NEW_CATEGORY}>+ Nova categoria…</SelectItem>
                </SelectContent>
              </Select>
            )}
          </Field>
          <Field label="Recorrência"><FormSelect value={form.recurrence} onChange={(v) => setForm({ ...form, recurrence: v })} options={RECORRENCIAS} /></Field>
          <div className="sm:col-span-2"><Field label="Notas"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-black/50 border-white/10" rows={2} /></Field></div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-white/10" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={save}>{editing ? "Guardar" : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ===================================================================
// TRANSAÇÕES
// ===================================================================
const PAGE_SIZE = 20

function TransactionsTab({ transactions, projects, currency, reload, categories = [] }: any) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [filters, setFilters] = useState<any>({ type: "", status: "", projectId: "", search: "" })
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "date", dir: "desc" })
  const [groupByMonth, setGroupByMonth] = useState(false)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => transactions.filter((t: any) => {
    if (filters.type && t.type !== filters.type) return false
    if (filters.status && t.status !== filters.status) return false
    if (filters.projectId && t.projectId !== filters.projectId) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const hay = `${t.projectName || ""} ${t.category || ""} ${t.notes || ""} ${t.client || ""}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }), [transactions, filters])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    const dir = sort.dir === "asc" ? 1 : -1
    arr.sort((a, b) => {
      if (sort.key === "value") return (a.value - b.value) * dir
      return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir
    })
    return arr
  }, [filtered, sort])

  useEffect(() => { setPage(1) }, [filters, sort, groupByMonth])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged = useMemo(() => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sorted, page])

  const groups = useMemo(() => {
    if (!groupByMonth) return null
    const map = new Map<string, any[]>()
    sorted.forEach((t) => {
      const k = new Date(t.date).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(t)
    })
    return Array.from(map.entries()).map(([label, rows]) => ({
      label, rows, total: rows.reduce((a, t) => a + t.value, 0),
    }))
  }, [sorted, groupByMonth])

  const toggleSort = (key: string) => setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" })

  const openNew = () => { setEditing(null); setOpen(true) }
  const openEdit = (t: any) => { setEditing(t); setOpen(true) }

  const remove = async (id: string) => {
    try { await agencyApi.deleteTransaction(id); toast({ title: "Transação removida" }); reload() }
    catch (e: any) { toast({ title: "Erro", description: e?.message, variant: "destructive" }) }
  }

  const statusColor = (s: string) => s === "Pago" ? "border-green-500/50 text-green-400" : s === "Pendente" ? "border-yellow-500/50 text-yellow-400" : "border-blue-500/50 text-blue-400"

  return (
    <Card className="glass-card border-0">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 shrink-0" /> Transações ({filtered.length})</CardTitle>
        <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto" onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Nova transação</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* filtros */}
        <div className="flex flex-wrap gap-2 md:gap-3 items-center">
          <div className="hidden sm:flex items-center gap-2 text-muted-foreground"><Filter className="h-4 w-4" /></div>
          <Input placeholder="Pesquisar…" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="w-full sm:w-48 bg-black/50 border-white/10" />
          <FilterSelect value={filters.type} onChange={(v) => setFilters({ ...filters, type: v })} placeholder="Tipo" options={TIPOS} />
          <FilterSelect value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} placeholder="Estado" options={ESTADOS} />
          <FilterSelect value={filters.projectId} onChange={(v) => setFilters({ ...filters, projectId: v })} placeholder="Projeto" options={projects.map((p: any) => ({ label: p.name, value: p.id }))} />
          {(filters.type || filters.status || filters.projectId || filters.search) && (
            <Button variant="ghost" size="sm" onClick={() => setFilters({ type: "", status: "", projectId: "", search: "" })}>Limpar</Button>
          )}
          <div className="flex items-center gap-2 ml-auto text-sm text-muted-foreground">
            <Switch checked={groupByMonth} onCheckedChange={setGroupByMonth} />
            <Label className="cursor-pointer" onClick={() => setGroupByMonth((v) => !v)}>Agrupar por mês</Label>
          </div>
        </div>

        {/* 10 columns never fit a phone: scroll the table instead of crushing it. */}
        <div className="rounded-lg border border-white/10 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead><SortHeader label="Data" active={sort.key === "date"} dir={sort.dir} onClick={() => toggleSort("date")} /></TableHead>
                <TableHead>Projeto</TableHead><TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead><TableHead>Categoria</TableHead>
                <TableHead className="text-right"><SortHeader label="Valor" active={sort.key === "value"} dir={sort.dir} onClick={() => toggleSort("value")} align="right" /></TableHead>
                <TableHead>Estado</TableHead><TableHead>Recorrência</TableHead><TableHead>Notas</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups
                ? groups.map((g) => (
                  <Fragment key={g.label}>
                    <TableRow className="border-white/5 bg-white/[0.03] hover:bg-white/[0.03]">
                      <TableCell colSpan={5} className="font-medium capitalize text-muted-foreground">{g.label}</TableCell>
                      <TableCell className={`text-right font-medium ${g.total < 0 ? "text-red-400" : "text-green-400"}`}>{eur(g.total, currency)}</TableCell>
                      <TableCell colSpan={4} />
                    </TableRow>
                    {g.rows.map((t: any) => (
                      <TxRow key={t.id} t={t} currency={currency} statusColor={statusColor} openEdit={openEdit} remove={remove} />
                    ))}
                  </Fragment>
                ))
                : paged.map((t: any) => (
                  <TxRow key={t.id} t={t} currency={currency} statusColor={statusColor} openEdit={openEdit} remove={remove} />
                ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Sem transações.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>

        {!groupByMonth && totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="border-white/10" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" className="border-white/10" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Seguinte</Button>
            </div>
          </div>
        )}
      </CardContent>

      <TransactionDialog open={open} setOpen={setOpen} editing={editing} projects={projects} reload={reload} categories={categories} />
    </Card>
  )
}

function SortHeader({ label, active, dir, onClick, align }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void; align?: "right" }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`inline-flex items-center gap-1 hover:text-white transition-colors ${active ? "text-white" : ""} ${align === "right" ? "flex-row-reverse" : ""}`}
    >
      {label}
      <span className="text-[10px] w-2.5 inline-block">{active ? (dir === "asc" ? "▲" : "▼") : ""}</span>
    </button>
  )
}

function TxRow({ t, currency, statusColor, openEdit, remove }: any) {
  return (
    <TableRow className="border-white/5">
      <TableCell className="whitespace-nowrap">{new Date(t.date).toLocaleDateString("pt-PT")}</TableCell>
      <TableCell>{t.projectName || t.project?.name || "—"}</TableCell>
      <TableCell>{t.client || "—"}</TableCell>
      <TableCell><Badge variant="outline" className={t.type === "Receita" ? "border-green-500/50 text-green-400" : "border-red-500/50 text-red-400"}>{t.type}</Badge></TableCell>
      <TableCell>{t.category || "—"}</TableCell>
      <TableCell className={`text-right font-medium ${t.value < 0 ? "text-red-400" : "text-green-400"}`}>{eur(t.value, currency)}</TableCell>
      <TableCell><Badge variant="outline" className={statusColor(t.status)}>{t.status}</Badge></TableCell>
      <TableCell className="text-muted-foreground">{t.recurrence}</TableCell>
      <TableCell className="text-muted-foreground max-w-[160px] truncate">{t.notes}</TableCell>
      <TableCell>
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}><Edit className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ===================================================================
// ASSISTENTE AI
// ===================================================================
type ChatMsg = { role: "user" | "assistant"; content: string; actions?: { action: string; summary: string; success: boolean }[] }

// mini-markdown: **negrito** + listas com "- "
function md(text: string) {
  const bold = (s: string, key: number) =>
    s.split(/\*\*(.+?)\*\*/g).map((part, i) => i % 2 ? <strong key={`${key}-${i}`} className="font-semibold text-white">{part}</strong> : part)

  const lines = text.split("\n")
  const out: any[] = []
  let list: string[] = []
  const flush = () => {
    if (list.length) {
      out.push(
        <ul key={out.length} className="list-disc pl-5 space-y-0.5 my-1">
          {list.map((li, i) => <li key={i}>{bold(li, i)}</li>)}
        </ul>
      )
      list = []
    }
  }
  lines.forEach((line, i) => {
    const m = line.match(/^\s*[-•]\s+(.*)/)
    if (m) { list.push(m[1]); return }
    flush()
    if (line.trim()) out.push(<p key={`p${i}`} className="my-0.5">{bold(line, i)}</p>)
  })
  flush()
  return out
}

const CHAT_KEY = "agency-ai-chat"

function AssistantWidget({ reload }: any) {
  const isNarrow = useIsMobile()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(CHAT_KEY) || "[]") } catch { return [] }
  })
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try { sessionStorage.setItem(CHAT_KEY, JSON.stringify(messages)) } catch { /* storage cheio */ }
  }, [messages])

  useEffect(() => {
    if (messages.length > 0 || busy) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [messages, busy])

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    const next: ChatMsg[] = [...messages, { role: "user", content: text }]
    setMessages(next); setInput(""); setBusy(true)
    try {
      const res = await agencyApi.aiChat(next.map(({ role, content }) => ({ role, content })))
      setMessages([...next, { role: "assistant", content: res.reply, actions: res.actions }])
      if (res.actions?.length) reload() // dados mudaram — refrescar dashboard
    } catch (e: any) {
      setMessages([...next, { role: "assistant", content: `⚠️ Erro: ${e?.response?.data?.message || e?.message || "falha na API"}` }])
    } finally { setBusy(false) }
  }

  if (!open) {
    return (
      <Button
        aria-label="Abrir assistente"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full p-0 bg-primary hover:bg-primary/90 shadow-lg shadow-black/40"
      >
        <Bot className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <Card className="glass-card border-0 fixed bottom-5 right-5 z-50 w-[380px] max-w-[calc(100vw-2.5rem)] h-[70vh] max-h-[560px] flex flex-col shadow-xl shadow-black/50">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3 shrink-0">
        <CardTitle className="flex items-center gap-2 text-base min-w-0"><Bot className="h-5 w-5 shrink-0" /> <span className="truncate">Assistente da Agência</span></CardTitle>
        <div className="flex items-center gap-1 shrink-0">
          {messages.length > 0 && (
            <Button variant="outline" size="sm" className="border-white/10 hover:bg-white/5 hover:text-white" onClick={() => { setMessages([]); setInput("") }} disabled={busy}>
              <Plus className="h-4 w-4 mr-1.5" /> Novo
            </Button>
          )}
          <Button aria-label="Fechar assistente" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-lg border border-white/10 bg-black/30 p-3 space-y-4">
          {messages.length === 0 && !busy ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-muted-foreground">
              <Bot className="h-10 w-10 opacity-40" />
              <div className="text-sm max-w-xs">
                Regista movimentos ou faz perguntas sobre a agência.
                <div className="mt-3 flex flex-col gap-1.5 text-xs">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">"fiz 100€ hoje do cliente X"</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">"gastei 12€ no domínio"</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">"quanto lucrei este mês?"</span>
                </div>
              </div>
            </div>
          ) : (
          <>
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="h-7 w-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className={`max-w-[88%] sm:max-w-[80%] min-w-0 break-words rounded-2xl px-3 sm:px-4 py-2.5 text-sm ${m.role === "user" ? "bg-primary/20 border border-primary/30 rounded-br-md" : "bg-white/5 border border-white/10 rounded-bl-md"}`}>
                {m.role === "assistant" ? md(m.content) : <span className="whitespace-pre-wrap">{m.content}</span>}
                {m.actions && m.actions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                    {m.actions.map((a, j) => (
                      <div key={j} className={`text-xs flex items-center gap-1.5 ${a.success ? "text-green-400" : "text-red-400"}`}>
                        <ScrollText className="h-3 w-3 shrink-0" /> {a.summary}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex gap-2.5">
              <div className="h-7 w-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="rounded-2xl rounded-bl-md px-4 py-2.5 bg-white/5 border border-white/10 text-sm text-muted-foreground animate-pulse">A pensar…</div>
            </div>
          )}
          <div ref={bottomRef} />
          </>
          )}
        </div>
        <div className="flex gap-2 items-end shrink-0">
          <Textarea
            value={input} onChange={(e) => setInput(e.target.value)}
            enterKeyHint={isNarrow ? "enter" : "send"}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return
              // No teclado on-screen não há Shift+Enter, por isso Enter faz
              // nova linha no telemóvel e envia-se pelo botão.
              if (isNarrow) return
              // Enter envia; Shift/Ctrl/Cmd+Enter faz nova linha
              if (!e.shiftKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); send(); return }
              if (e.ctrlKey || e.metaKey) {
                // browsers não inserem nova linha com Ctrl/Cmd+Enter — fazemos à mão
                e.preventDefault()
                const el = e.currentTarget
                const { selectionStart: s, selectionEnd: f } = el
                setInput(input.slice(0, s) + "\n" + input.slice(f))
                requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 1 })
              }
            }}
            placeholder="Escreve uma mensagem…" disabled={busy} rows={1}
            className="bg-black/50 border-white/10 min-h-[44px] max-h-32 resize-none"
          />
          <Button aria-label="Enviar mensagem" className="bg-primary hover:bg-primary/90 h-11 w-11 shrink-0 p-0" onClick={send} disabled={busy || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground shrink-0">Ações do assistente (criar/editar/apagar) ficam registadas em Configuração.</p>
      </CardContent>
    </Card>
  )
}

// ===================================================================
// PROJETOS
// ===================================================================
const emptyProject = { name: "", client: "", model: "Mensal", baseValue: "", unit: "€", hoursPerDay: "", daysPerMonth: "", active: true, notes: "" }

const CADENCIA: Record<string, string> = { Hora: "por hora", "Diário": "por dia", Semanal: "por semana", Mensal: "por mês", Anual: "por ano", "Único": "único" }
const cadenceLabel = (p: any) => CADENCIA[p.model] || (p.frequency ? CADENCIA[p.frequency] || p.frequency.toLowerCase() : "")

function ProjectsTab({ projects, currency, reload }: any) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>(emptyProject)

  const openNew = () => { setEditing(null); setForm(emptyProject); setOpen(true) }
  const openEdit = (p: any) => { setEditing(p); setForm({ ...emptyProject, ...p, baseValue: p.baseValue ?? "", hoursPerDay: p.hoursPerDay ?? "", daysPerMonth: p.daysPerMonth ?? "" }); setOpen(true) }

  const save = async () => {
    if (!form.name) { toast({ title: "Nome obrigatório", variant: "destructive" }); return }
    try {
      const payload = { ...form, baseValue: Number(form.baseValue) || 0, hoursPerDay: Number(form.hoursPerDay) || 0, daysPerMonth: Number(form.daysPerMonth) || 0 }
      if (editing) await agencyApi.updateProject(editing.id, payload)
      else await agencyApi.createProject(payload)
      toast({ title: editing ? "Projeto atualizado" : "Projeto criado" })
      setOpen(false); reload()
    } catch (e: any) { toast({ title: "Erro", description: e?.message, variant: "destructive" }) }
  }

  const remove = async (id: string) => {
    try { await agencyApi.deleteProject(id); toast({ title: "Projeto removido" }); reload() }
    catch (e: any) { toast({ title: "Erro", description: e?.message, variant: "destructive" }) }
  }

  const totalForecast = projects.reduce((a: number, p: any) => a + (p.monthlyForecast || 0), 0)

  return (
    <Card className="glass-card border-0">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CardTitle className="flex items-center gap-2 min-w-0"><Briefcase className="h-5 w-5 shrink-0" /> <span className="break-words">Projetos · receita prevista total {eur(totalForecast, currency)}/mês</span></CardTitle>
        <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto shrink-0" onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo projeto</Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-white/10 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>Projeto</TableHead><TableHead>Cliente</TableHead><TableHead>Modelo</TableHead>
                <TableHead className="text-right">Valor base</TableHead>
                <TableHead className="text-right">Receita prevista</TableHead>
                <TableHead className="text-right">Lucro atual</TableHead><TableHead>Ativo</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p: any) => (
                <TableRow key={p.id} className="border-white/5">
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.client || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="border-white/20">{p.model}</Badge></TableCell>
                  <TableCell className="text-right">
                    {p.baseValue} {p.unit || ""}
                    {cadenceLabel(p) && <span className="text-muted-foreground text-xs"> {cadenceLabel(p)}</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.monthlyForecast ? (
                      <>
                        <div className="font-medium text-green-400 leading-tight">{eur(p.monthlyForecast, currency)}/mês</div>
                        <div className="text-xs text-muted-foreground leading-tight">{eur(p.monthlyForecast * 12, currency)}/ano</div>
                      </>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${p.realProfit > 0 ? "text-green-400" : p.realProfit < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                    {p.realProfit ? eur(p.realProfit, currency) : "—"}
                  </TableCell>
                  <TableCell><Badge variant="outline" className={p.active ? "border-green-500/50 text-green-400" : "border-white/20 text-muted-foreground"}>{p.active ? "Sim" : "Não"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {projects.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Sem projetos.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-black/90 border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar projeto" : "Novo projeto"}</DialogTitle>
            <DialogDescription>A receita mensal prevista é calculada automaticamente consoante o modelo.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nome"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-black/50 border-white/10" /></Field>
            <Field label="Cliente"><Input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} className="bg-black/50 border-white/10" /></Field>
            <Field label="Modelo"><FormSelect value={form.model} onChange={(v) => setForm({ ...form, model: v })} options={MODELOS} /></Field>
            <Field label="Valor base"><Input type="number" step="0.01" value={form.baseValue} onChange={(e) => setForm({ ...form, baseValue: e.target.value })} className="bg-black/50 border-white/10" /></Field>
            <Field label="Unidade"><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="bg-black/50 border-white/10" placeholder="€/h, €" /></Field>
            <Field label="Horas/dia"><Input type="number" value={form.hoursPerDay} onChange={(e) => setForm({ ...form, hoursPerDay: e.target.value })} className="bg-black/50 border-white/10" /></Field>
            <Field label="Dias/mês"><Input type="number" value={form.daysPerMonth} onChange={(e) => setForm({ ...form, daysPerMonth: e.target.value })} className="bg-black/50 border-white/10" /></Field>
            <div className="sm:col-span-2"><Field label="Notas"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-black/50 border-white/10" rows={2} /></Field></div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Projeto ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-white/10" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={save}>{editing ? "Guardar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ===================================================================
// CONFIG
// ===================================================================
function ConfigTab({ reload }: any) {
  const { toast } = useToast()
  const [cfg, setCfg] = useState<any>(null)

  useEffect(() => { agencyApi.getConfig().then((c) => setCfg({ ...c, monthStart: c.monthStart?.slice(0, 10) || "", monthEnd: c.monthEnd?.slice(0, 10) || "" })) }, [])

  const save = async () => {
    try {
      await agencyApi.updateConfig({ currency: cfg.currency, defaultHoursPerDay: Number(cfg.defaultHoursPerDay), defaultDaysPerMonth: Number(cfg.defaultDaysPerMonth), monthStart: cfg.monthStart || null, monthEnd: cfg.monthEnd || null })
      toast({ title: "Configuração guardada" }); reload()
    } catch (e: any) { toast({ title: "Erro", description: e?.message, variant: "destructive" }) }
  }

  if (!cfg) return <div className="text-muted-foreground">A carregar…</div>

  return (
    <div className="space-y-5">
      <Card className="glass-card border-0 max-w-xl">
        <CardHeader><CardTitle className="flex items-center gap-2"><SettingsIcon className="h-5 w-5" /> Configuração</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Moeda"><Input value={cfg.currency} onChange={(e) => setCfg({ ...cfg, currency: e.target.value })} className="bg-black/50 border-white/10" /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Horas default/dia"><Input type="number" value={cfg.defaultHoursPerDay} onChange={(e) => setCfg({ ...cfg, defaultHoursPerDay: e.target.value })} className="bg-black/50 border-white/10" /></Field>
            <Field label="Dias default/mês"><Input type="number" value={cfg.defaultDaysPerMonth} onChange={(e) => setCfg({ ...cfg, defaultDaysPerMonth: e.target.value })} className="bg-black/50 border-white/10" /></Field>
            <Field label="Mês atual início"><Input type="date" value={cfg.monthStart} onChange={(e) => setCfg({ ...cfg, monthStart: e.target.value })} className="bg-black/50 border-white/10" /></Field>
            <Field label="Mês atual fim"><Input type="date" value={cfg.monthEnd} onChange={(e) => setCfg({ ...cfg, monthEnd: e.target.value })} className="bg-black/50 border-white/10" /></Field>
          </div>
          <p className="text-xs text-muted-foreground">Nota: valores negativos = despesas/withdraws.</p>
          <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto" onClick={save}>Guardar configuração</Button>
        </CardContent>
      </Card>

      <AiLogsSection />
    </div>
  )
}

// ===================================================================
// AI LOGS (secção dentro de Configuração)
// ===================================================================
function AiLogsSection() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    agencyApi.aiLogs(200).then(setLogs).catch(() => setLogs([])).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <Card className="glass-card border-0">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base min-w-0"><ScrollText className="h-5 w-5 shrink-0" /> <span className="truncate">Ações do assistente AI</span></CardTitle>
        <Button variant="outline" size="sm" className="border-white/10" onClick={load}>Atualizar</Button>
      </CardHeader>
      <CardContent>
        {loading ? <div className="text-muted-foreground">A carregar…</div> : (
          <div className="rounded-lg border border-white/10 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead>Quando</TableHead><TableHead>Ação</TableHead><TableHead>Descrição</TableHead><TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id} className="border-white/5">
                    <TableCell className="whitespace-nowrap text-muted-foreground">{new Date(l.createdAt).toLocaleString("pt-PT")}</TableCell>
                    <TableCell><Badge variant="outline" className="border-white/20">{l.action}</Badge></TableCell>
                    <TableCell>{l.summary}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={l.success ? "border-green-500/50 text-green-400" : "border-red-500/50 text-red-400"}>
                        {l.success ? "OK" : "Erro"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sem ações registadas ainda.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ===================================================================
// helpers UI
// ===================================================================
function Field({ label, children }: any) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>
}

const NONE = "__none__"
function FormSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: any[] }) {
  const opts = options.map((o) => typeof o === "string" ? { label: o || "— Nenhum —", value: o } : o)
  return (
    <Select value={value === "" ? NONE : value} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
      <SelectTrigger className="bg-black/50 border-white/10"><SelectValue placeholder="Selecionar" /></SelectTrigger>
      <SelectContent className="bg-black/90 border-white/10">
        {opts.map((o) => <SelectItem key={o.value || NONE} value={o.value === "" ? NONE : o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

function FilterSelect({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: any[] }) {
  const opts = options.map((o) => typeof o === "string" ? { label: o, value: o } : o)
  return (
    <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
      <SelectTrigger className="w-36 bg-black/50 border-white/10"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent className="bg-black/90 border-white/10">
        <SelectItem value="all">{placeholder}: todos</SelectItem>
        {opts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}
