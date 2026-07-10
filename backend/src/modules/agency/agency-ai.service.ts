import { prisma } from '../../shared/services/prisma.service';
import { AppError } from '../../shared/middleware/errorHandler';
import { logger } from '../../shared/utils/logger';
import * as svc from './agency.service';

// ------------------------------------------------------------------
// Assistente AI da Agência — agente com tools sobre a API da agência.
// Usa a API da OpenAI (chat completions + tool calling).
// ------------------------------------------------------------------

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.5-mini';

const SYSTEM_PROMPT = `És o assistente da Agência no Zero45 Dashboard. Falas português de Portugal, de forma curta e direta.

O QUE É O SISTEMA:
Um módulo de cashflow de uma agência: transações (receitas e despesas), projetos (clientes / fontes de receita recorrente) e KPIs (receita, despesas, lucro, saldo, previsões).

REGRAS DOS DADOS:
- Transação: { date (YYYY-MM-DD), type: "Receita"|"Despesa", value (SEMPRE positivo — o tipo define o sinal), status: "Pago"|"Pendente"|"Previsto" (default Pago), recurrence: "Único"|"Diário"|"Semanal"|"Mensal"|"Anual"|"Contínuo" (default Único), category, client, projectId, notes — opcionais }.
- Projeto: { name (obrigatório), client, model: "Hora"|"Diário"|"Semanal"|"Mensal"|"Anual"|"Único" (o model define a cadência da receita), baseValue, unit, hoursPerDay, daysPerMonth, active, notes }.
- Hoje é {TODAY}. Se o utilizador disser "hoje", "ontem", etc., converte para data absoluta.

O QUE PODES FAZER (tools):
- Consultar resumo/KPIs, listar/criar/atualizar/apagar transações, listar/criar/atualizar/apagar projetos.
- Quando o utilizador reportar algo em linguagem natural ("fiz 100€ hoje", "gastei 30 em hosting"), regista diretamente com a tool certa — sem pedir confirmação, a não ser que falte informação essencial (valor ou tipo).
- Antes de apagar ou atualizar, se não tiveres o id, lista primeiro para o encontrar. Confirma com o utilizador antes de apagar se houver ambiguidade.

O QUE NÃO PODES FAZER:
- Nada fora do módulo da agência (sem SSH, sem servidores, sem outras páginas).
- Não inventes dados: se não sabes, usa as tools para consultar.

Depois de agir, responde numa frase curta a confirmar o que foi feito (com o valor e tipo). Todas as tuas ações ficam registadas nos logs do AI.`;

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
        run: (a: any) => svc.createTransaction(a),
        mutating: true,
    },
    {
        name: 'update_transaction',
        description: 'Atualiza uma transação existente pelo id.',
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
                notes: { type: 'string' },
            },
            required: ['id'],
        },
        run: (a: any) => {
            const { id, ...data } = a;
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
];

const toolByName = new Map(TOOLS.map((t) => [t.name, t]));
const openaiTools = TOOLS.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters },
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

type ChatMessage = { role: string; content: string | null; tool_calls?: any[]; tool_call_id?: string };

async function callOpenAI(messages: ChatMessage[]) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new AppError('OPENAI_API_KEY não configurada no backend', 500);

    const res = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: OPENAI_MODEL, messages, tools: openaiTools }),
    });
    if (!res.ok) {
        const body = await res.text();
        logger.error(`OpenAI error ${res.status}: ${body}`);
        throw new AppError(`Erro da OpenAI (${res.status})`, 502);
    }
    const json: any = await res.json();
    return json.choices[0].message;
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
    const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT.replace('{TODAY}', today) },
        ...history.slice(-30).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content ?? '') })),
    ];

    const actions: { action: string; summary: string; success: boolean }[] = [];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const msg = await callOpenAI(messages);

        if (!msg.tool_calls || msg.tool_calls.length === 0) {
            return { reply: msg.content ?? '', actions };
        }

        messages.push(msg);
        for (const tc of msg.tool_calls) {
            const tool = toolByName.get(tc.function.name);
            let args: any = {};
            try { args = JSON.parse(tc.function.arguments || '{}'); } catch { /* args inválidos */ }

            let content: string;
            if (!tool) {
                content = JSON.stringify({ error: `Tool desconhecida: ${tc.function.name}` });
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
            messages.push({ role: 'tool', tool_call_id: tc.id, content });
        }
    }

    return { reply: 'Não consegui terminar o pedido (demasiadas iterações). Tenta reformular.', actions };
}
