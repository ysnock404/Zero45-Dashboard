import { prisma } from '../../shared/services/prisma.service';
import { logger } from '../../shared/utils/logger';
import * as ai from '../agency/agency-ai.service';

// ------------------------------------------------------------------
// Bot Telegram — fala com o mesmo assistente AI do dashboard.
// Long polling (não precisa de webhook/URL pública).
// Histórico persistido por chat em telegram_chats; /new limpa.
// ------------------------------------------------------------------

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = () => `https://api.telegram.org/bot${TOKEN}`;
const MAX_HISTORY = 40;

// Allowlist obrigatória: sem ela qualquer pessoa que encontre o bot
// podia mexer nas finanças. IDs separados por vírgula.
const allowedChatIds = new Set(
    (process.env.TELEGRAM_ALLOWED_CHAT_IDS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
);

async function tg(method: string, payload: any) {
    const res = await fetch(`${API()}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const json: any = await res.json().catch(() => null);
    if (!json?.ok) logger.error(`Telegram ${method} falhou: ${JSON.stringify(json)}`);
    return json;
}

async function sendMessage(chatId: string, text: string) {
    // Telegram limita a 4096 chars por mensagem
    for (let i = 0; i < text.length; i += 4000) {
        await tg('sendMessage', { chat_id: chatId, text: text.slice(i, i + 4000) });
    }
}

async function loadHistory(chatId: string): Promise<{ role: string; content: string }[]> {
    const row = await prisma.telegramChat.findUnique({ where: { chatId } });
    try { return JSON.parse(row?.history || '[]'); } catch { return []; }
}

async function saveHistory(chatId: string, history: { role: string; content: string }[]) {
    const trimmed = history.slice(-MAX_HISTORY);
    await prisma.telegramChat.upsert({
        where: { chatId },
        create: { chatId, history: JSON.stringify(trimmed) },
        update: { history: JSON.stringify(trimmed) },
    });
}

async function handleMessage(chatId: string, text: string) {
    if (!allowedChatIds.has(chatId)) {
        await sendMessage(chatId, `Não estás autorizado. O teu chat id é ${chatId} — adiciona-o a TELEGRAM_ALLOWED_CHAT_IDS no servidor para teres acesso.`);
        return;
    }

    if (text === '/start') {
        await sendMessage(chatId, 'Boas! Sou o assistente do Zero45. Fala comigo sobre a agência (transações, projetos, KPIs) ou o servidor. /new começa uma conversa nova.');
        return;
    }
    if (text === '/new') {
        await saveHistory(chatId, []);
        await sendMessage(chatId, 'Conversa nova. Diz coisas.');
        return;
    }

    await tg('sendChatAction', { chat_id: chatId, action: 'typing' });

    const history = await loadHistory(chatId);
    history.push({ role: 'user', content: text });

    try {
        const { reply, actions } = await ai.chat(history);
        history.push({ role: 'assistant', content: reply });
        await saveHistory(chatId, history);

        let out = reply || '(sem resposta)';
        if (actions.length) {
            out += '\n\n' + actions.map((a) => `${a.success ? '✅' : '❌'} ${a.summary}`).join('\n');
        }
        await sendMessage(chatId, out);
    } catch (e: any) {
        logger.error('Telegram AI error:', e);
        await sendMessage(chatId, `⚠️ Erro: ${e?.message || 'falha no assistente'}`);
    }
}

let offset = 0;
let running = false;

async function pollLoop() {
    while (running) {
        try {
            const res = await tg('getUpdates', { timeout: 50, offset, allowed_updates: ['message'] });
            for (const u of res?.result || []) {
                offset = u.update_id + 1;
                const msg = u.message;
                if (!msg?.text) continue;
                // não bloquear o polling enquanto o AI responde
                handleMessage(String(msg.chat.id), msg.text.trim()).catch((e) => logger.error('Telegram handler error:', e));
            }
        } catch (e) {
            logger.error('Telegram poll error:', e);
            await new Promise((r) => setTimeout(r, 5000));
        }
    }
}

export function startTelegramBot() {
    if (!TOKEN) {
        logger.info('Telegram bot desativado (TELEGRAM_BOT_TOKEN não definido)');
        return;
    }
    if (allowedChatIds.size === 0) {
        logger.warn('Telegram bot ativo mas sem TELEGRAM_ALLOWED_CHAT_IDS — vai recusar toda a gente e mostrar o chat id.');
    }
    running = true;
    pollLoop();
    logger.info('✓ Telegram bot a fazer polling');
}
