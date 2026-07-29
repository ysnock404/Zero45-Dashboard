/**
 * Formatação partilhada do módulo Agência.
 *
 * Tudo aqui assume a convenção do backend: despesas são guardadas como
 * valores negativos, por isso a maior parte das somas usa `Math.abs`
 * apenas quando se quer mostrar a grandeza, nunca no cálculo do lucro.
 */

export const eur = (n: number, currency = "€") =>
  `${(n ?? 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`

/** Versão curta para eixos de gráficos e ecrãs estreitos: 12,4k € */
export const eurCompact = (n: number, currency = "€") => {
  const v = n ?? 0
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${(v / 1_000_000).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}M ${currency}`
  if (abs >= 1_000) return `${(v / 1_000).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}k ${currency}`
  return `${v.toLocaleString("pt-PT", { maximumFractionDigits: 0 })} ${currency}`
}

export const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })

/** "12 mar" — para listas densas onde o ano é redundante. */
export const fmtDateShort = (d: string | Date) =>
  new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })

export const fmtDateTime = (d: string | Date) =>
  new Date(d).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

/**
 * Runway em texto legível. O backend devolve `null` quando não se está a
 * queimar dinheiro (burn <= 0), que é o caso bom e não deve aparecer como
 * "0 meses".
 */
export const fmtRunway = (meses: number | null | undefined) => {
  if (meses === null || meses === undefined) return "Sustentável"
  if (meses < 0) return "Saldo negativo"
  if (meses < 1) return "< 1 mês"
  if (meses >= 24) return "24+ meses"
  return `${meses.toLocaleString("pt-PT", { maximumFractionDigits: 1 })} meses`
}

export const TIPOS = ["Receita", "Despesa"]
export const RECORRENCIAS = ["Único", "Diário", "Semanal", "Mensal", "Anual", "Contínuo"]
export const MODELOS = ["Hora", "Diário", "Semanal", "Mensal", "Anual", "Único"]
export const ESTADOS = ["Pago", "Pendente", "Previsto"]

export const CHART_COLORS = [
  "#ef4444", "#f59e0b", "#22c55e", "#3b82f6",
  "#a855f7", "#ec4899", "#14b8a6", "#eab308",
]

export const tooltipStyle = {
  backgroundColor: "rgba(10,10,12,0.95)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  color: "#fff",
  fontSize: 12,
}

/** Cores por estado — usadas em badges de transações. */
export const statusClass = (s: string) =>
  s === "Pago"
    ? "border-green-500/50 text-green-400"
    : s === "Pendente"
      ? "border-yellow-500/50 text-yellow-400"
      : "border-blue-500/50 text-blue-400"

export const CADENCIA: Record<string, string> = {
  Hora: "por hora",
  "Diário": "por dia",
  Semanal: "por semana",
  Mensal: "por mês",
  Anual: "por ano",
  "Único": "único",
}

export const cadenceLabel = (p: any) =>
  CADENCIA[p.model] || (p.frequency ? CADENCIA[p.frequency] || p.frequency.toLowerCase() : "")
