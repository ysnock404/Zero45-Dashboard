import { prisma } from '../../shared/services/prisma.service';
import { AppError } from '../../shared/middleware/errorHandler';

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthLabelPT = (year: number, monthIdx0: number) => {
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `${meses[monthIdx0]} ${year}`;
};
const MESES_PT = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Receita mensal prevista de um projeto, consoante o modelo
export function projectMonthlyForecast(p: {
    model: string;
    baseValue: number;
    hoursPerDay: number;
    daysPerMonth: number;
    frequency?: string | null;
    active: boolean;
}): number {
    if (!p.active) return 0;
    switch (p.model) {
        case 'Hora':
            return round2(p.baseValue * (p.hoursPerDay || 0) * (p.daysPerMonth || 0));
        case 'Mensal':
            return round2(p.baseValue);
        case 'Anual':
            return round2(p.baseValue / 12);
        case 'Diário':
        case 'Semanal':
            return round2(p.baseValue * recurrenceMonthlyMultiplier(p.model));
        case 'Variável':
            // legado: valor base × frequência (ex: 367,5€ semanal ≈ ×4,345/mês)
            return round2(p.baseValue * recurrenceMonthlyMultiplier(p.frequency || ''));
        case 'Único':
        default:
            return 0;
    }
}

// Quantas vezes uma recorrência ocorre por mês (aproximação)
function recurrenceMonthlyMultiplier(recurrence: string): number {
    switch (recurrence) {
        case 'Diário':
            return 30;
        case 'Semanal':
            return 4.345;
        case 'Mensal':
        case 'Contínuo':
            return 1;
        case 'Anual':
            return 1 / 12;
        case 'Único':
        default:
            return 0; // não projeta para o futuro
    }
}

// ------------------------------------------------------------------
// Config
// ------------------------------------------------------------------

export async function getConfig() {
    let cfg = await prisma.agencyConfig.findUnique({ where: { id: 'default' } });
    if (!cfg) {
        cfg = await prisma.agencyConfig.create({ data: { id: 'default' } });
    }
    return cfg;
}

export async function updateConfig(data: any) {
    await getConfig();
    return prisma.agencyConfig.update({
        where: { id: 'default' },
        data: {
            currency: data.currency,
            defaultHoursPerDay: data.defaultHoursPerDay,
            defaultDaysPerMonth: data.defaultDaysPerMonth,
            monthStart: data.monthStart ? new Date(data.monthStart) : undefined,
            monthEnd: data.monthEnd ? new Date(data.monthEnd) : undefined,
        },
    });
}

// ------------------------------------------------------------------
// Projects CRUD
// ------------------------------------------------------------------

export async function listProjects() {
    const projects = await prisma.agencyProject.findMany({ orderBy: { createdAt: 'asc' } });
    // lucro real por projeto: soma das transações pagas (receitas +, despesas -)
    const totals = await prisma.agencyTransaction.groupBy({
        by: ['projectId'],
        where: { status: 'Pago', projectId: { not: null } },
        _sum: { value: true },
    });
    const profitByProject = new Map(totals.map((t) => [t.projectId, t._sum.value ?? 0]));
    return projects.map((p) => ({
        ...p,
        monthlyForecast: projectMonthlyForecast(p),
        realProfit: round2(profitByProject.get(p.id) ?? 0),
    }));
}

export async function createProject(data: any) {
    const p = await prisma.agencyProject.create({
        data: {
            name: data.name,
            client: data.client ?? null,
            model: data.model ?? 'Mensal',
            baseValue: Number(data.baseValue) || 0,
            unit: data.unit ?? null,
            frequency: data.frequency ?? null,
            hoursPerDay: Number(data.hoursPerDay) || 0,
            daysPerMonth: Number(data.daysPerMonth) || 0,
            active: data.active ?? true,
            notes: data.notes ?? null,
        },
    });
    return { ...p, monthlyForecast: projectMonthlyForecast(p) };
}

export async function updateProject(id: string, data: any) {
    const exists = await prisma.agencyProject.findUnique({ where: { id } });
    if (!exists) throw new AppError('Projeto não encontrado', 404);
    const p = await prisma.agencyProject.update({
        where: { id },
        data: {
            name: data.name,
            client: data.client,
            model: data.model,
            baseValue: data.baseValue !== undefined ? Number(data.baseValue) : undefined,
            unit: data.unit,
            frequency: data.frequency,
            hoursPerDay: data.hoursPerDay !== undefined ? Number(data.hoursPerDay) : undefined,
            daysPerMonth: data.daysPerMonth !== undefined ? Number(data.daysPerMonth) : undefined,
            active: data.active,
            notes: data.notes,
        },
    });
    return { ...p, monthlyForecast: projectMonthlyForecast(p) };
}

export async function deleteProject(id: string) {
    const exists = await prisma.agencyProject.findUnique({ where: { id } });
    if (!exists) throw new AppError('Projeto não encontrado', 404);
    await prisma.agencyProject.delete({ where: { id } });
    return { id };
}

// ------------------------------------------------------------------
// Transactions CRUD + filtros
// ------------------------------------------------------------------

export interface TxFilters {
    projectId?: string;
    client?: string;
    type?: string;
    status?: string;
    category?: string;
    recurrence?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
}

export async function listTransactions(filters: TxFilters = {}) {
    const where: any = {};
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.client) where.client = filters.client;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.recurrence) where.recurrence = filters.recurrence;
    if (filters.dateFrom || filters.dateTo) {
        where.date = {};
        if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
        if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
    }
    if (filters.search) {
        where.OR = [
            { notes: { contains: filters.search } },
            { projectName: { contains: filters.search } },
            { category: { contains: filters.search } },
        ];
    }
    return prisma.agencyTransaction.findMany({
        where,
        orderBy: { date: 'desc' },
        include: { project: { select: { id: true, name: true } } },
    });
}

// normaliza valor consoante o tipo (Despesa => negativo)
function normalizeValue(type: string, value: number): number {
    const v = Math.abs(Number(value) || 0);
    return type === 'Despesa' ? -v : v;
}

export async function createTransaction(data: any) {
    let projectName = data.projectName ?? null;
    let client = data.client ?? null;
    if (data.projectId) {
        const p = await prisma.agencyProject.findUnique({ where: { id: data.projectId } });
        if (p) {
            projectName = p.name;
            if (!client) client = p.client;
        }
    }
    return prisma.agencyTransaction.create({
        data: {
            date: new Date(data.date),
            projectId: data.projectId ?? null,
            projectName,
            client,
            type: data.type ?? 'Despesa',
            category: data.category ?? null,
            value: normalizeValue(data.type ?? 'Despesa', data.value),
            status: data.status ?? 'Pago',
            recurrence: data.recurrence ?? 'Único',
            notes: data.notes ?? null,
        },
    });
}

export async function updateTransaction(id: string, data: any) {
    const exists = await prisma.agencyTransaction.findUnique({ where: { id } });
    if (!exists) throw new AppError('Transação não encontrada', 404);
    const type = data.type ?? exists.type;

    // ao ligar a um projeto, herdar nome/cliente como no create — senão a linha
    // ficava com o projectId certo mas o nome antigo (ou vazio) na tabela.
    let projectName = data.projectName;
    let client = data.client;
    if (data.projectId) {
        const p = await prisma.agencyProject.findUnique({ where: { id: data.projectId } });
        if (p) {
            projectName = p.name;
            if (client === undefined || client === null) client = p.client;
        }
    }

    return prisma.agencyTransaction.update({
        where: { id },
        data: {
            date: data.date ? new Date(data.date) : undefined,
            projectId: data.projectId !== undefined ? data.projectId : undefined,
            projectName: projectName ?? undefined,
            client: client ?? undefined,
            type: data.type,
            category: data.category,
            value: data.value !== undefined ? normalizeValue(type, data.value) : undefined,
            status: data.status,
            recurrence: data.recurrence,
            notes: data.notes,
        },
    });
}

export async function deleteTransaction(id: string) {
    const exists = await prisma.agencyTransaction.findUnique({ where: { id } });
    if (!exists) throw new AppError('Transação não encontrada', 404);
    await prisma.agencyTransaction.delete({ where: { id } });
    return { id };
}

// ------------------------------------------------------------------
// Dashboard summary (KPIs) — tudo ligado às transações + projetos
// ------------------------------------------------------------------

// `month` é 1-based (1 = janeiro). Sem `month`, usa o mês corrente real.
export async function getSummary(year?: number, month?: number) {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const curMonth = month !== undefined ? month - 1 : now.getMonth();
    const cfg = await getConfig();

    const txs = await prisma.agencyTransaction.findMany();
    const projects = await prisma.agencyProject.findMany();

    const inCurrentMonth = (d: Date) => d.getFullYear() === y && d.getMonth() === curMonth;

    // só "Pago" conta como receita/despesa real — Pendente/Previsto não é
    // dinheiro que já entrou ou saiu, por isso fica de fora destas somas.
    let receitaMes = 0,
        despesaMes = 0,
        receitaPendenteMes = 0,
        despesaPendenteMes = 0,
        receitaPendenteTotal = 0,
        despesaPendenteTotal = 0,
        receitaTotal = 0,
        despesaTotal = 0;

    for (const t of txs) {
        const isReceita = t.type === 'Receita';
        const isPago = t.status === 'Pago';
        if (isPago) {
            if (isReceita) receitaTotal += t.value;
            else despesaTotal += t.value;
        }
        // pendente acumulado de sempre — dinheiro por liquidar não desaparece
        // quando o mês vira, por isso o total não filtra por data.
        if (t.status === 'Pendente') {
            if (isReceita) receitaPendenteTotal += t.value;
            else despesaPendenteTotal += t.value;
        }
        if (inCurrentMonth(new Date(t.date))) {
            if (isReceita) {
                if (isPago) receitaMes += t.value;
                if (t.status === 'Pendente') receitaPendenteMes += t.value;
            } else {
                if (isPago) despesaMes += t.value;
                if (t.status === 'Pendente') despesaPendenteMes += t.value;
            }
        }
    }

    const lucroMes = receitaMes + despesaMes;
    const lucroTotal = receitaTotal + despesaTotal;

    // receita prevista mensal = soma forecasts dos projetos ativos
    const receitaPrevistaMes = round2(
        projects.reduce((acc, p) => acc + projectMonthlyForecast(p), 0)
    );
    const projetosAtivos = projects.filter((p) => p.active).length;

    // despesa recorrente mensal projetada (subscrições etc.)
    const despesaRecorrenteMes = round2(
        txs
            .filter((t) => t.type === 'Despesa' && t.recurrence !== 'Único')
            .reduce((acc, t) => acc + Math.abs(t.value) * recurrenceMonthlyMultiplier(t.recurrence), 0)
    );

    // saldo total acumulado (runway base)
    const saldoTotal = round2(lucroTotal);

    // burn mensal líquido previsto (despesa recorrente - receita prevista)
    const burnMensal = round2(despesaRecorrenteMes - receitaPrevistaMes);
    // runway: se estamos a queimar dinheiro, quantos meses dura o saldo
    const runwayMeses = burnMensal > 0 ? round2(saldoTotal / burnMensal) : null; // null = positivo/infinito

    // projeção honesta para o fim do mês: o que já foi feito + o que falta do
    // mês (receita/despesa previstas), pro-rateado pelos dias que restam —
    // NUNCA mostra a meta cheia como se já estivesse garantida.
    const diasNoMes = new Date(y, curMonth + 1, 0).getDate();
    const mesSelecionadoKey = y * 12 + curMonth;
    const mesAtualKey = now.getFullYear() * 12 + now.getMonth();
    const diasPassados =
        mesSelecionadoKey === mesAtualKey ? now.getDate() // mês corrente: até hoje
            : mesSelecionadoKey < mesAtualKey ? diasNoMes // mês passado: já terminou
                : 0; // mês futuro: nada ainda
    const diasRestantes = Math.max(0, diasNoMes - diasPassados);
    const fracaoRestante = diasNoMes > 0 ? diasRestantes / diasNoMes : 0;

    const receitaPrevistaRestante = round2(receitaPrevistaMes * fracaoRestante);
    const despesaPrevistaRestante = round2(despesaRecorrenteMes * fracaoRestante);
    const receitaPrevistaFimMes = round2(receitaMes + receitaPrevistaRestante);
    const despesaPrevistaFimMes = round2(despesaMes - despesaPrevistaRestante);
    const lucroPrevistoFimMes = round2(receitaPrevistaFimMes + despesaPrevistaFimMes);
    const saldoPrevistoFimMes = round2(saldoTotal + (lucroPrevistoFimMes - lucroMes));

    // despesa média mensal (com base nos meses com atividade)
    const monthsWithData = new Set(txs.map((t) => monthKey(new Date(t.date))));
    const despesaMediaMensal =
        monthsWithData.size > 0 ? round2(despesaTotal / monthsWithData.size) : 0;

    return {
        year: y,
        month: curMonth + 1,
        mesLabel: MESES_PT[curMonth],
        currency: cfg.currency,
        receitaMes: round2(receitaMes),
        despesaMes: round2(despesaMes),
        receitaPendenteMes: round2(receitaPendenteMes),
        despesaPendenteMes: round2(despesaPendenteMes),
        receitaPendenteTotal: round2(receitaPendenteTotal),
        despesaPendenteTotal: round2(despesaPendenteTotal),
        lucroMes: round2(lucroMes),
        receitaPrevistaMes,
        despesaRecorrenteMes,
        projetosAtivos,
        saldoTotal,
        receitaAnualPrevista: round2(receitaPrevistaMes * 12),
        despesaMediaMensal,
        receitaTotal: round2(receitaTotal),
        despesaTotal: round2(despesaTotal),
        lucroTotal,
        burnMensal,
        runwayMeses,
        diasNoMes,
        diasPassados,
        diasRestantes,
        receitaPrevistaRestante,
        despesaPrevistaRestante,
        receitaPrevistaFimMes,
        despesaPrevistaFimMes,
        lucroPrevistoFimMes,
        saldoPrevistoFimMes,
    };
}

// ------------------------------------------------------------------
// Cashflow mensal real (12 meses do ano)
// ------------------------------------------------------------------

export async function getCashflow(year?: number) {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const txs = await prisma.agencyTransaction.findMany({
        where: {
            date: { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31, 23, 59, 59) },
        },
    });

    const months = Array.from({ length: 12 }, (_, i) => ({
        month: monthLabelPT(y, i),
        receita: 0,
        despesas: 0,
        lucro: 0,
        acumulado: 0,
    }));

    for (const t of txs) {
        const idx = new Date(t.date).getMonth();
        if (t.type === 'Receita') months[idx].receita += t.value;
        else months[idx].despesas += t.value;
    }

    let running = 0;
    for (const m of months) {
        m.receita = round2(m.receita);
        m.despesas = round2(m.despesas);
        m.lucro = round2(m.receita + m.despesas);
        running += m.lucro;
        m.acumulado = round2(running);
    }
    return months;
}

// ------------------------------------------------------------------
// Forecast: projeção para a frente (recorrências + projetos)
// ------------------------------------------------------------------

export async function getForecast(monthsAhead = 12) {
    const now = new Date();
    const projects = await prisma.agencyProject.findMany();
    const txs = await prisma.agencyTransaction.findMany();

    const receitaPrevistaMes = projects.reduce((acc, p) => acc + projectMonthlyForecast(p), 0);
    const despesaRecorrenteMes = txs
        .filter((t) => t.type === 'Despesa' && t.recurrence !== 'Único')
        .reduce((acc, t) => acc + Math.abs(t.value) * recurrenceMonthlyMultiplier(t.recurrence), 0);
    const receitaRecorrenteMes = txs
        .filter((t) => t.type === 'Receita' && t.recurrence !== 'Único')
        .reduce((acc, t) => acc + Math.abs(t.value) * recurrenceMonthlyMultiplier(t.recurrence), 0);

    // saldo base = lucro total real até agora
    let running = txs.reduce((acc, t) => acc + t.value, 0);

    const out = [];
    for (let i = 1; i <= monthsAhead; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const receita = round2(receitaPrevistaMes + receitaRecorrenteMes);
        const despesas = round2(-despesaRecorrenteMes);
        const lucro = round2(receita + despesas);
        running += lucro;
        out.push({
            month: monthLabelPT(d.getFullYear(), d.getMonth()),
            receita,
            despesas,
            lucro,
            acumulado: round2(running),
        });
    }
    return {
        receitaPrevistaMes: round2(receitaPrevistaMes),
        despesaRecorrenteMes: round2(despesaRecorrenteMes),
        series: out,
    };
}

// ------------------------------------------------------------------
// Reports / breakdowns
// ------------------------------------------------------------------

export async function getReports(filters: TxFilters = {}) {
    const txs = await listTransactions(filters);

    const groupSum = (keyFn: (t: any) => string, onlyType?: string) => {
        const map: Record<string, number> = {};
        for (const t of txs) {
            if (onlyType && t.type !== onlyType) continue;
            // sem projeto/categoria/cliente o grupo é "Outros" — um travessão
            // não se lê como rótulo num gráfico.
            const k = keyFn(t) || 'Outros';
            map[k] = round2((map[k] || 0) + Math.abs(t.value));
        }
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    };

    // Lucro por projeto: receita menos despesa imputada ao mesmo projeto.
    // `groupSum` devolve sempre grandezas (Math.abs), por isso a despesa
    // ganha aqui o sinal negativo. O resultado pode ser negativo — um projeto
    // que só teve custos é exatamente a informação que interessa ver.
    const projeto = (t: any) => t.projectName || t.project?.name;
    const receitaPorProjeto = groupSum(projeto, 'Receita');
    const despesaPorProjeto = groupSum(projeto, 'Despesa');

    const lucroMap: Record<string, { receita: number; despesa: number }> = {};
    for (const { name, value } of receitaPorProjeto) {
        lucroMap[name] = { receita: value, despesa: 0 };
    }
    for (const { name, value } of despesaPorProjeto) {
        if (!lucroMap[name]) lucroMap[name] = { receita: 0, despesa: 0 };
        lucroMap[name].despesa = value;
    }

    const lucroPorProjeto = Object.entries(lucroMap)
        .map(([name, { receita, despesa }]) => ({
            name,
            value: round2(receita - despesa),
            receita,
            despesa,
        }))
        .sort((a, b) => b.value - a.value);

    return {
        receitaPorProjeto,
        despesaPorCategoria: groupSum((t) => t.category, 'Despesa'),
        receitaPorCliente: groupSum((t) => t.client, 'Receita'),
        despesaPorProjeto,
        lucroPorProjeto,
    };
}

// CSV export
export async function exportTransactionsCSV(filters: TxFilters = {}) {
    const txs = await listTransactions(filters);
    const header = ['Data', 'Projeto', 'Cliente', 'Tipo', 'Categoria', 'Valor', 'Estado', 'Recorrência', 'Notas'];
    const rows = txs.map((t) => [
        new Date(t.date).toISOString().slice(0, 10),
        t.projectName || t.project?.name || '',
        t.client || '',
        t.type,
        t.category || '',
        String(t.value),
        t.status,
        t.recurrence,
        (t.notes || '').replace(/"/g, '""'),
    ]);
    return [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
}

// ------------------------------------------------------------------
// Recorrência automática: materializar transações em falta
// ------------------------------------------------------------------

export async function generateRecurring(upToDate?: string) {
    const until = upToDate ? new Date(upToDate) : new Date();
    const recurring = await prisma.agencyTransaction.findMany({
        where: { recurrence: { in: ['Mensal', 'Anual', 'Semanal', 'Diário', 'Contínuo'] }, generated: false },
    });

    const created: any[] = [];
    for (const t of recurring) {
        const stepMonths =
            t.recurrence === 'Anual' ? 12 : t.recurrence === 'Mensal' || t.recurrence === 'Contínuo' ? 1 : 0;
        if (stepMonths === 0) continue; // semanal/diário: ignorado nesta versão de materialização

        // próxima ocorrência a partir da data original
        let next = new Date(t.date);
        next.setMonth(next.getMonth() + stepMonths);

        while (next <= until) {
            // já existe uma transação gerada para esta data/origem?
            const dup = await prisma.agencyTransaction.findFirst({
                where: {
                    generated: true,
                    projectId: t.projectId,
                    category: t.category,
                    value: t.value,
                    date: { gte: new Date(next.getFullYear(), next.getMonth(), 1), lte: new Date(next.getFullYear(), next.getMonth() + 1, 0, 23, 59, 59) },
                },
            });
            if (!dup) {
                const nt = await prisma.agencyTransaction.create({
                    data: {
                        date: new Date(next),
                        projectId: t.projectId,
                        projectName: t.projectName,
                        client: t.client,
                        type: t.type,
                        category: t.category,
                        value: t.value,
                        status: 'Previsto',
                        recurrence: t.recurrence,
                        notes: t.notes ? `${t.notes} (auto)` : 'auto',
                        generated: true,
                    },
                });
                created.push(nt);
            }
            next = new Date(next);
            next.setMonth(next.getMonth() + stepMonths);
        }
    }
    return { created: created.length, transactions: created };
}
