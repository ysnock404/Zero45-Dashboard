import { Request, Response } from 'express';
import * as svc from './agency.service';
import * as ai from './agency-ai.service';
import { AppError } from '../../shared/middleware/errorHandler';
import { logger } from '../../shared/utils/logger';

const handle = (fn: (req: Request, res: Response) => Promise<any>) => async (req: Request, res: Response) => {
    try {
        const data = await fn(req, res);
        if (!res.headersSent) res.json({ status: 'success', data });
    } catch (error) {
        if (error instanceof AppError) {
            return res.status(error.statusCode).json({ status: 'error', message: error.message });
        }
        logger.error('Agency error:', error);
        res.status(500).json({ status: 'error', message: 'Erro interno do módulo Agency' });
    }
};

const parseFilters = (q: any): svc.TxFilters => ({
    projectId: q.projectId || undefined,
    client: q.client || undefined,
    type: q.type || undefined,
    status: q.status || undefined,
    category: q.category || undefined,
    recurrence: q.recurrence || undefined,
    dateFrom: q.dateFrom || undefined,
    dateTo: q.dateTo || undefined,
    search: q.search || undefined,
});

export const agencyController = {
    // Dashboard
    getSummary: handle((req) => svc.getSummary(req.query.year ? Number(req.query.year) : undefined)),
    getCashflow: handle((req) => svc.getCashflow(req.query.year ? Number(req.query.year) : undefined)),
    getForecast: handle((req) => svc.getForecast(req.query.months ? Number(req.query.months) : 12)),
    getReports: handle((req) => svc.getReports(parseFilters(req.query))),

    // Config
    getConfig: handle(() => svc.getConfig()),
    updateConfig: handle((req) => svc.updateConfig(req.body)),

    // Projects
    listProjects: handle(() => svc.listProjects()),
    createProject: handle((req) => svc.createProject(req.body)),
    updateProject: handle((req) => svc.updateProject(req.params.id, req.body)),
    deleteProject: handle((req) => svc.deleteProject(req.params.id)),

    // Transactions
    listTransactions: handle((req) => svc.listTransactions(parseFilters(req.query))),
    createTransaction: handle((req) => svc.createTransaction(req.body)),
    updateTransaction: handle((req) => svc.updateTransaction(req.params.id, req.body)),
    deleteTransaction: handle((req) => svc.deleteTransaction(req.params.id)),
    generateRecurring: handle((req) => svc.generateRecurring(req.body?.upToDate)),

    // Assistente AI
    aiChat: handle((req) => ai.chat(req.body?.messages)),
    aiLogs: handle((req) => ai.listAiLogs(req.query.limit ? Number(req.query.limit) : 100)),

    // Export
    exportCSV: async (req: Request, res: Response) => {
        try {
            const csv = await svc.exportTransactionsCSV(parseFilters(req.query));
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="transacoes.csv"');
            res.send('﻿' + csv); // BOM p/ Excel
        } catch (error) {
            logger.error('Agency CSV export error:', error);
            res.status(500).json({ status: 'error', message: 'Falha ao exportar CSV' });
        }
    },
};
