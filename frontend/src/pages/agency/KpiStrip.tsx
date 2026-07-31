import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, Briefcase, Clock } from "lucide-react"
import { eur } from "./format"

type Tone = "up" | "down" | "neutral" | "warn"

function toneClass(tone: Tone) {
  return tone === "up" ? "text-green-400" : tone === "down" ? "text-red-400" : tone === "warn" ? "text-amber-400" : "text-foreground"
}

/**
 * KPI individual. Em mobile é deliberadamente compacto: o rótulo em cima,
 * o valor grande por baixo, sem ícone, para caberem dois por linha sem
 * truncar valores como "1.234,56 €".
 */
function Kpi({
  label,
  value,
  sub,
  tone = "neutral",
  icon,
}: {
  label: string
  value: string
  sub?: string
  tone?: Tone
  icon?: React.ReactNode
}) {
  return (
    <div className="min-w-0 p-3 sm:p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon && <span className="shrink-0 hidden sm:inline-flex [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>}
        <span className="text-[11px] sm:text-xs font-medium truncate">{label}</span>
      </div>
      <div className={`text-base sm:text-lg lg:text-xl font-bold leading-tight tabular-nums break-words ${toneClass(tone)}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</div>}
    </div>
  )
}

/**
 * Faixa de KPIs do topo da Agência.
 *
 * O valor grande é sempre o real (só "Pago", até hoje) — nunca a meta como
 * se já estivesse garantida. A projeção honesta para o fim do mês (feito +
 * pro-rateado pelos dias que restam) fica só no subtítulo pequeno.
 */
export function KpiStrip({ summary, currency }: { summary: any; currency: string }) {
  const s = summary || {}
  const lucroPositivo = (s.lucroMes ?? 0) >= 0

  const receitaPendente = s.receitaPendenteMes ?? 0
  const despesaPendente = Math.abs(s.despesaPendenteMes ?? 0)
  const pendenteTotal = receitaPendente + despesaPendente

  return (
    <Card className="glass-card border-0 overflow-hidden">
      <CardContent className="p-0">
        <div
          className="
            grid grid-cols-2 md:grid-cols-5
            [&>*]:border-white/5
            [&>*]:border-t [&>*]:border-l
            [&>*:nth-child(-n+2)]:border-t-0
            [&>*:nth-child(odd)]:border-l-0
            md:[&>*:nth-child(-n+5)]:border-t-0
            md:[&>*:nth-child(odd)]:border-l
            md:[&>*:nth-child(5n+1)]:border-l-0
          "
        >
          <Kpi
            label="Receita (mês)"
            value={eur(s.receitaMes ?? 0, currency)}
            sub={`Previsto: ${eur(s.receitaPrevistaFimMes ?? s.receitaMes ?? 0, currency)}`}
            tone={(s.receitaMes ?? 0) > 0 ? "up" : "neutral"}
            icon={<TrendingUp />}
          />
          <Kpi
            label="Despesa (mês)"
            value={eur(Math.abs(s.despesaMes ?? 0), currency)}
            sub={`Previsto: ${eur(Math.abs(s.despesaPrevistaFimMes ?? s.despesaMes ?? 0), currency)}`}
            tone={(s.despesaMes ?? 0) !== 0 ? "down" : "neutral"}
            icon={<TrendingDown />}
          />
          <Kpi
            label="Pendente (mês)"
            value={eur(pendenteTotal, currency)}
            tone="warn"
            icon={<Clock />}
          />
          <Kpi
            label="Lucro (mês)"
            value={eur(s.lucroMes ?? 0, currency)}
            sub={`Previsto: ${eur(s.lucroPrevistoFimMes ?? s.lucroMes ?? 0, currency)}`}
            tone={lucroPositivo ? "up" : "down"}
            icon={lucroPositivo ? <TrendingUp /> : <TrendingDown />}
          />
          <Kpi
            label="Saldo acumulado"
            value={eur(s.saldoTotal ?? 0, currency)}
            tone={(s.saldoTotal ?? 0) >= 0 ? "up" : "down"}
            icon={<Wallet />}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export { Kpi, Briefcase }
