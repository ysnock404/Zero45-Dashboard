import { prisma } from '../../shared/services/prisma.service';
import { AppError } from '../../shared/middleware/errorHandler';
import { logger } from '../../shared/utils/logger';
import * as svc from './agency.service';
import { hostService } from '../host/host.service';

// ------------------------------------------------------------------
// Assistente AI da Agência — agente com tools sobre a API da agência.
// Usa a API da OpenAI (chat completions + tool calling).
// ------------------------------------------------------------------

const OPENAI_URL = 'https://api.openai.com/v1/responses';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-luna';

const SYSTEM_PROMPT = `És o assistente do Zero45 Dashboard. Falas português de Portugal, de forma curta e direta.

O QUE É O SISTEMA:
Um dashboard de infraestrutura pessoal com um módulo de cashflow de agência: transações (receitas e despesas), projetos (clientes / fontes de receita recorrente) e KPIs (receita, despesas, lucro, saldo, previsões). Também consegues consultar métricas do servidor (CPU, RAM, discos, rede, uptime) com a tool get_server_metrics.

REGRAS DOS DADOS:
- Transação: { date (YYYY-MM-DD), type: "Receita"|"Despesa", value (SEMPRE positivo — o tipo define o sinal), status: "Pago"|"Pendente"|"Previsto" (default Pago), recurrence: "Único"|"Diário"|"Semanal"|"Mensal"|"Anual"|"Contínuo" (default Único), category, client, projectId, notes — opcionais }.
- Projeto: { name (obrigatório), client, model: "Hora"|"Diário"|"Semanal"|"Mensal"|"Anual"|"Único" (o model define a cadência da receita), baseValue, unit, hoursPerDay, daysPerMonth, active, notes }.
- Hoje é {TODAY}. Se o utilizador disser "hoje", "ontem", etc., converte para data absoluta.

O QUE PODES FAZER (tools):
- Consultar resumo/KPIs, listar/criar/atualizar/apagar transações, listar/criar/atualizar/apagar projetos.
- Quando o utilizador reportar algo em linguagem natural ("fiz 100€ hoje", "gastei 30 em hosting"), regista diretamente com a tool certa — sem pedir confirmação, a não ser que falte informação essencial (valor ou tipo).
- Antes de apagar ou atualizar, se não tiveres o id, lista primeiro para o encontrar. Confirma com o utilizador antes de apagar se houver ambiguidade.
- NUNCA inventes ids. projectId só pode ser um id devolvido por list_projects nesta conversa; se não tens a certeza, deixa projectId vazio e põe só o nome em projectName — o sistema resolve. Nunca ponhas um nome no campo projectId.
- Para associar um projeto a transações que já existem, usa update_transaction com projectId ou projectName. Não precisas de recriar nem apagar nada.
- Só afirmes que algo foi criado/apagado depois de a tool devolver sucesso. Se uma tool falhar, diz ao utilizador o que falhou.

O QUE NÃO PODES FAZER:
- Nada além das tools disponíveis (sem SSH, sem executar comandos, sem alterar o servidor — só leitura de métricas).
- Não inventes dados: se não sabes, usa as tools para consultar.

Depois de agir, responde numa frase curta a confirmar o que foi feito (com o valor e tipo). Todas as tuas ações ficam registadas nos logs do AI.`;

// Aceita id real, ou resolve por nome (o modelo às vezes manda o nome no
// campo projectId, ou um id inventado — sem isto rebenta a foreign key).
//
// Um projectId que não exista NUNCA pode chegar ao Prisma: a FK rebenta e a
// transação perde-se. Por isso o id inventado é descartado e tentamos ainda
// assim resolver pelo nome, que é o que o modelo costuma acertar.
async function resolveProjectRef(args: any) {
    if (args.projectId === undefined && args.projectName === undefined) return args;

    const projects = await prisma.agencyProject.findMany();
    if (args.projectId && projects.some((p) => p.id === args.projectId)) return args;

    // o id não existe (ou nem foi dado) — resolver pelo nome. Se o modelo pôs
    // o nome no campo projectId, ainda assim serve como termo de procura.
    const candidates = [args.projectName, args.projectId].filter(Boolean).map((r) => String(r).toLowerCase().trim());
    let match: { id: string; name: string } | undefined;
    for (const q of candidates) {
        if (!q) continue;
        match = projects.find((p) => p.name.toLowerCase() === q)
            || projects.find((p) => p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase()));
        if (match) break;
    }

    // sem correspondência o projectId fica a null (texto livre em projectName),
    // que é válido no schema — melhor uma transação sem projeto do que nenhuma.
    return {
        ...args,
        projectId: match?.id ?? null,
        projectName: match ? match.name : (args.projectName ?? (args.projectId ? String(args.projectId) : null)),
    };
}

// ---------------- tools ----------------

const TOOLS = [
    {
        name: 'get_summary',
        description: 'KPIs do dashboard: receita/despesa/lucro do mês, saldo total, previsões, projetos ativos.',
        parameters: { type: 'object', properties: { year: { type: 'number' } } },
        run: (a: any) => svc.getSummary(a.year),
        mutating: false,
    },
    {
        name: 'list_transactions',
        description: 'Lista transações, com filtros opcionais.',
        parameters: {
            type: 'object',
            properties: {
                type: { type: 'string', enum: ['Receita', 'Despesa'] },
                status: { type: 'string', enum: ['Pago', 'Pendente', 'Previsto'] },
                projectId: { type: 'string' },
                client: { type: 'string' },
                category: { type: 'string' },
                dateFrom: { type: 'string', description: 'YYYY-MM-DD' },
                dateTo: { type: 'string', description: 'YYYY-MM-DD' },
                search: { type: 'string' },
            },
        },
        run: (a: any) => svc.listTransactions(a),
        mutating: false,
    },
    {
        name: 'create_transaction',
        description: 'Cria uma transação. value sempre positivo; type define o sinal.',
        parameters: {
            type: 'object',
            properties: {
                date: { type: 'string', description: 'YYYY-MM-DD' },
                type: { type: 'string', enum: ['Receita', 'Despesa'] },
                value: { type: 'number' },
                status: { type: 'string', enum: ['Pago', 'Pendente', 'Previsto'] },
                recurrence: { type: 'string', enum: ['Único', 'Diário', 'Semanal', 'Mensal', 'Anual', 'Contínuo'] },
                category: { type: 'string' },
                client: { type: 'string' },
                projectId: { type: 'string' },
                projectName: { type: 'string' },
                notes: { type: 'string' },
            },
            required: ['date', 'type', 'value'],
        },
        run: async (a: any) => svc.createTransaction(await resolveProjectRef(a)),
        mutating: true,
    },
    {
        name: 'update_transaction',
        description: 'Atualiza uma transação existente pelo id. Serve também para associar (ou remover) o projeto: passa projectId ou projectName.',
        parameters: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                date: { type: 'string' },
                type: { type: 'string', enum: ['Receita', 'Despesa'] },
                value: { type: 'number' },
                status: { type: 'string' },
                recurrence: { type: 'string' },
                category: { type: 'string' },
                client: { type: 'string' },
                projectId: { type: 'string' },
                projectName: { type: 'string' },
                notes: { type: 'string' },
            },
            required: ['id'],
        },
        run: async (a: any) => {
            const { id, ...data } = await resolveProjectRef(a);
            return svc.updateTransaction(id, data);
        },
        mutating: true,
    },
    {
        name: 'delete_transaction',
        description: 'Apaga uma transação pelo id.',
        parameters: {
            type: 'object',
            properties: { id: { type: 'string' } },
            required: ['id'],
        },
        run: (a: any) => svc.deleteTransaction(a.id),
        mutating: true,
    },
    {
        name: 'list_projects',
        description: 'Lista os projetos da agência (com receita mensal prevista).',
        parameters: { type: 'object', properties: {} },
        run: () => svc.listProjects(),
        mutating: false,
    },
    {
        name: 'create_project',
        description: 'Cria um projeto.',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                client: { type: 'string' },
                model: { type: 'string', enum: ['Hora', 'Diário', 'Semanal', 'Mensal', 'Anual', 'Único'] },
                baseValue: { type: 'number' },
                unit: { type: 'string' },
                hoursPerDay: { type: 'number' },
                daysPerMonth: { type: 'number' },
                active: { type: 'boolean' },
                notes: { type: 'string' },
            },
            required: ['name'],
        },
        run: (a: any) => svc.createProject(a),
        mutating: true,
    },
    {
        name: 'update_project',
        description: 'Atualiza um projeto existente pelo id.',
        parameters: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                client: { type: 'string' },
                model: { type: 'string' },
                baseValue: { type: 'number' },
                active: { type: 'boolean' },
                notes: { type: 'string' },
            },
            required: ['id'],
        },
        run: (a: any) => {
            const { id, ...data } = a;
            return svc.updateProject(id, data);
        },
        mutating: true,
    },
    {
        name: 'delete_project',
        description: 'Apaga um projeto pelo id.',
        parameters: {
            type: 'object',
            properties: { id: { type: 'string' } },
            required: ['id'],
        },
        run: (a: any) => svc.deleteProject(a.id),
        mutating: true,
    },
    {
        name: 'get_server_metrics',
        description: 'Métricas atuais do servidor: CPU, RAM, discos, rede, temperatura, uptime.',
        parameters: { type: 'object', properties: {} },
        run: () => hostService.getMetrics(),
        mutating: false,
    },
];

const toolByName = new Map(TOOLS.map((t) => [t.name, t]));
// formato de tools da Responses API (/v1/responses)
const openaiTools = TOOLS.map((t) => ({
    type: 'function',
    name: t.name,
    description: t.description,
    parameters: t.parameters,
}));

// ---------------- logging ----------------

function summarizeAction(name: string, args: any, result: any): string {
    switch (name) {
        case 'create_transaction':
            return `Criou transação: ${args.type} de ${args.value}€ (${args.date})${args.notes ? ` — ${args.notes}` : ''}`;
        case 'update_transaction':
            return `Atualizou transação ${args.id}`;
        case 'delete_transaction':
            return `Apagou transação ${args.id}`;
        case 'create_project':
            return `Criou projeto "${args.name}"`;
        case 'update_project':
            return `Atualizou projeto ${args.id}`;
        case 'delete_project':
            return `Apagou projeto ${args.id}`;
        default:
            return `Executou ${name}`;
    }
}

async function logAction(action: string, args: any, result: any, success: boolean, errorMsg?: string) {
    try {
        await prisma.agencyAiLog.create({
            data: {
                action,
                summary: success ? summarizeAction(action, args, result) : `Falhou ${action}: ${errorMsg}`,
                input: JSON.stringify(args ?? null),
                result: success ? JSON.stringify(result ?? null).slice(0, 4000) : errorMsg ?? null,
                success,
            },
        });
    } catch (e) {
        logger.error('Falha a gravar AI log:', e);
    }
}

export async function listAiLogs(limit = 100) {
    return prisma.agencyAiLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
}

// ---------------- chat loop ----------------

async function callOpenAI(instructions: string, input: any[]) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new AppError('OPENAI_API_KEY não configurada no backend', 500);

    let lastStatus = 0;
    let lastDetail = '';
    // retry para erros transitórios (401 intermitente, 429, 5xx)
    for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 800 * attempt));
        const res = await fetch(OPENAI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: OPENAI_MODEL,
                instructions,
                input,
                tools: openaiTools,
                // stateless: não guardar no servidor da OpenAI; devolver reasoning cifrado
                // para podermos reenviar os itens nas rondas seguintes de tools
                store: false,
                include: ['reasoning.encrypted_content'],
            }),
        });
        if (res.ok) return (await res.json()) as any;
        const body = await res.text();
        logger.error(`OpenAI error ${res.status} (tentativa ${attempt + 1}): ${body}`);
        lastStatus = res.status;
        try { lastDetail = JSON.parse(body)?.error?.message || ''; } catch { lastDetail = ''; }
        if (res.status === 400) break; // pedido inválido — retry não ajuda
    }
    // 500 (não 502) para o proxy não intercetar a resposta com página própria
    throw new AppError(`Erro da OpenAI (${lastStatus})${lastDetail ? `: ${lastDetail}` : ''}`, 500);
}

const MAX_TOOL_ROUNDS = 8;

/**
 * Recebe o histórico [{role:'user'|'assistant', content}] e corre o loop
 * agentico: chama a OpenAI, executa tools pedidas, devolve a resposta final
 * e a lista de ações executadas.
 */
export async function chat(history: { role: string; content: string }[]) {
    if (!Array.isArray(history) || history.length === 0) {
        throw new AppError('Histórico de mensagens vazio', 400);
    }

    const today = new Date().toISOString().slice(0, 10);
    const instructions = SYSTEM_PROMPT.replace('{TODAY}', today);
    const input: any[] = history.slice(-30).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content ?? ''),
    }));

    const actions: { action: string; summary: string; success: boolean }[] = [];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const resp = await callOpenAI(instructions, input);
        const output: any[] = resp.output || [];
        const calls = output.filter((o) => o.type === 'function_call');

        if (calls.length === 0) {
            const reply = output
                .filter((o) => o.type === 'message')
                .flatMap((m) => m.content || [])
                .filter((c: any) => c.type === 'output_text')
                .map((c: any) => c.text)
                .join('');
            return { reply, actions };
        }

        // reenviar os itens de output (incl. reasoning cifrado) + resultados das tools
        input.push(...output);
        for (const tc of calls) {
            const tool = toolByName.get(tc.name);
            let args: any = {};
            try { args = JSON.parse(tc.arguments || '{}'); } catch { /* args inválidos */ }

            let content: string;
            if (!tool) {
                content = JSON.stringify({ error: `Tool desconhecida: ${tc.name}` });
            } else {
                try {
                    const result = await tool.run(args);
                    content = JSON.stringify(result ?? null).slice(0, 12000);
                    if (tool.mutating) {
                        await logAction(tool.name, args, result, true);
                        actions.push({ action: tool.name, summary: summarizeAction(tool.name, args, result), success: true });
                    }
                } catch (e: any) {
                    content = JSON.stringify({ error: e?.message || 'Erro ao executar tool' });
                    if (tool.mutating) {
                        await logAction(tool.name, args, null, false, e?.message);
                        actions.push({ action: tool.name, summary: `Falhou ${tool.name}: ${e?.message}`, success: false });
                    }
                }
            }
            input.push({ type: 'function_call_output', call_id: tc.call_id, output: content });
        }
    }

    return { reply: 'Não consegui terminar o pedido (demasiadas iterações). Tenta reformular.', actions };
}
