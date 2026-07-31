import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, Briefcase } from "lucide-react"
import { eur } from "./format"

type Tone = "up" | "down" | "neutral"

function toneClass(tone: Tone) {
  return tone === "up" ? "text-green-400" : tone === "down" ? "text-red-400" : "text-foreground"
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
  badge,
}: {
  label: string
  value: string
  sub?: string
  tone?: Tone
  icon?: React.ReactNode
  badge?: { label: string; value: string }
}) {
  return (
    <div className="min-w-0 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
          {icon && <span className="shrink-0 hidden sm:inline-flex [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>}
          <span className="text-[11px] sm:text-xs font-medium truncate">{label}</span>
        </div>
        {badge && (
          <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400 whitespace-nowrap">
            {badge.label}: {badge.value}
          </span>
        )}
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
 * Receita/Despesa/Lucro mostram a projeção honesta para o fim do mês: o que
 * já foi feito até hoje + o que falta do mês pro-rateado pelos dias
 * restantes (nunca a meta cheia como se já estivesse garantida).
 */
export function KpiStrip({ summary, currency }: { summary: any; currency: string }) {
  const s = summary || {}
  const lucroPositivo = (s.lucroPrevistoFimMes ?? s.lucroMes ?? 0) >= 0
  const progresso = `dia ${s.diasPassados ?? 0}/${s.diasNoMes ?? 0} de ${s.mesLabel ?? "mês"}`

  return (
    <Card className="glass-card border-0 overflow-hidden">
      <CardContent className="p-0">
        <div
          className="
            grid grid-cols-2 md:grid-cols-4
            [&>*]:border-white/5
            [&>*]:border-t [&>*]:border-l
            [&>*:nth-child(-n+2)]:border-t-0
            [&>*:nth-child(odd)]:border-l-0
            md:[&>*:nth-child(-n+4)]:border-t-0
            md:[&>*:nth-child(odd)]:border-l
            md:[&>*:nth-child(4n+1)]:border-l-0
          "
        >
          <Kpi
            label="Receita prevista (mês)"
            value={eur(s.receitaPrevistaFimMes ?? s.receitaMes ?? 0, currency)}
            sub={`${eur(s.receitaMes ?? 0, currency)} feita + ${eur(s.receitaPrevistaRestante ?? 0, currency)} prevista`}
            tone={(s.receitaPrevistaFimMes ?? 0) > 0 ? "up" : "neutral"}
            icon={<TrendingUp />}
          />
          <Kpi
            label="Despesa prevista (mês)"
            value={eur(Math.abs(s.despesaPrevistaFimMes ?? s.despesaMes ?? 0), currency)}
            sub={`${eur(Math.abs(s.despesaMes ?? 0), currency)} feita + ${eur(s.despesaPrevistaRestante ?? 0, currency)} prevista`}
            tone={(s.despesaPrevistaFimMes ?? 0) !== 0 ? "down" : "neutral"}
            icon={<TrendingDown />}
            badge={(s.despesaPendenteMes ?? 0) !== 0 ? { label: "Pendente", value: eur(Math.abs(s.despesaPendenteMes), currency) } : undefined}
          />
          <Kpi
            label="Lucro previsto (mês)"
            value={eur(s.lucroPrevistoFimMes ?? s.lucroMes ?? 0, currency)}
            sub={progresso}
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
