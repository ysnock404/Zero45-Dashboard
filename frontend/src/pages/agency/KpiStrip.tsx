import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, Briefcase, Clock } from "lucide-react"
import { eur } from "./format"

type Tone = "up" | "down" | "neutral" | "warn" | "info"

function toneClass(tone: Tone) {
  switch (tone) {
    case "up":
      return "text-green-400"
    case "down":
      return "text-red-400"
    case "warn":
      return "text-amber-400"
    case "info":
      return "text-blue-400"
    default:
      return "text-foreground"
  }
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

  // Pendente é dinheiro por liquidar nos dois sentidos, por isso o valor tem
  // de ser líquido: o que há a receber menos o que há a pagar. Somar as duas
  // pernas dava um total que crescia com as despesas, como se dever mais fosse
  // estar melhor.
  //
  // O pendente é acumulado de sempre, não do mês: uma fatura por cobrar de
  // Março continua por cobrar em Agosto, e desaparecer do KPI só porque o mês
  // virou escondia exatamente o que interessa vigiar.
  const receitaPendente = s.receitaPendenteTotal ?? 0
  const despesaPendente = Math.abs(s.despesaPendenteTotal ?? 0)
  const pendenteLiquido = receitaPendente - despesaPendente

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
            label="Pendente (total)"
            value={eur(pendenteLiquido, currency)}
            sub={`A receber ${eur(receitaPendente, currency)} · a pagar ${eur(despesaPendente, currency)}`}
            tone="warn"
            icon={<Clock />}
          />
          <Kpi
            label="Lucro (mês)"
            value={eur(s.lucroMes ?? 0, currency)}
            sub={`Previsto: ${eur(s.lucroPrevistoFimMes ?? s.lucroMes ?? 0, currency)}`}
            tone="info"
            icon={lucroPositivo ? <TrendingUp /> : <TrendingDown />}
          />
          <Kpi
            label="Saldo acumulado"
            value={eur(s.saldoTotal ?? 0, currency)}
            tone="neutral"
            icon={<Wallet />}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export { Kpi, Briefcase }
