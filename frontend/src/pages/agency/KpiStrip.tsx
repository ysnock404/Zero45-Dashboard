import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, Repeat, Briefcase, Target, PiggyBank } from "lucide-react"
import { eur, fmtRunway } from "./format"

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
 * Mostra também `runwayMeses`, `burnMensal` e `lucroTotal`, que o backend
 * já calculava mas nunca chegavam ao ecrã.
 */
export function KpiStrip({ summary, currency }: { summary: any; currency: string }) {
  const s = summary || {}
  const lucroPositivo = (s.lucroMes ?? 0) >= 0

  // burnMensal > 0 significa que se está a queimar dinheiro.
  const aQueimar = (s.burnMensal ?? 0) > 0

  return (
    <Card className="glass-card border-0 overflow-hidden">
      <CardContent className="p-0">
        <div
          className="
            grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7
            [&>*]:border-white/5
            [&>*]:border-t [&>*]:border-l
            [&>*:nth-child(-n+2)]:border-t-0
            [&>*:nth-child(odd)]:border-l-0
            md:[&>*:nth-child(-n+4)]:border-t-0
            md:[&>*:nth-child(odd)]:border-l
            md:[&>*:nth-child(4n+1)]:border-l-0
            xl:[&>*]:border-t-0
            xl:[&>*:nth-child(4n+1)]:border-l
            xl:[&>*:nth-child(7n+1)]:border-l-0
          "
        >
          <Kpi
            label="Receita (mês)"
            value={eur(s.receitaMes ?? 0, currency)}
            tone={(s.receitaMes ?? 0) > 0 ? "up" : "neutral"}
            icon={<TrendingUp />}
          />
          <Kpi
            label="Despesas (mês)"
            value={eur(Math.abs(s.despesaMes ?? 0), currency)}
            tone={(s.despesaMes ?? 0) !== 0 ? "down" : "neutral"}
            icon={<TrendingDown />}
          />
          <Kpi
            label="Lucro (mês)"
            value={eur(s.lucroMes ?? 0, currency)}
            tone={lucroPositivo ? "up" : "down"}
            icon={lucroPositivo ? <TrendingUp /> : <TrendingDown />}
          />
          <Kpi
            label="Saldo total"
            value={eur(s.saldoTotal ?? 0, currency)}
            sub={s.lucroTotal !== undefined ? `Lucro acum.: ${eur(s.lucroTotal, currency)}` : undefined}
            tone={(s.saldoTotal ?? 0) >= 0 ? "up" : "down"}
            icon={<Wallet />}
          />
          <Kpi
            label="Prevista (mês)"
            value={eur(s.receitaPrevistaMes ?? 0, currency)}
            sub={`Anual: ${eur(s.receitaAnualPrevista ?? 0, currency)}`}
            icon={<Target />}
          />
          <Kpi
            label="Recorrente (mês)"
            value={eur(s.despesaRecorrenteMes ?? 0, currency)}
            sub={aQueimar ? `Burn: ${eur(s.burnMensal, currency)}/mês` : "Sem burn líquido"}
            tone="down"
            icon={<Repeat />}
          />
          <Kpi
            label="Runway"
            value={fmtRunway(s.runwayMeses)}
            sub={`${s.projetosAtivos ?? 0} projeto(s) ativo(s)`}
            tone={s.runwayMeses === null || s.runwayMeses === undefined ? "up" : s.runwayMeses < 3 ? "down" : "neutral"}
            icon={<PiggyBank />}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export { Kpi, Briefcase }
