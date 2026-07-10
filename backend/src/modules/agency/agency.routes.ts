import { Router } from 'express';
import { agencyController as c } from './agency.controller';

export const agencyRouter = Router();

// Dashboard / analytics
agencyRouter.get('/summary', c.getSummary);
agencyRouter.get('/cashflow', c.getCashflow);
agencyRouter.get('/forecast', c.getForecast);
agencyRouter.get('/reports', c.getReports);

// Config
agencyRouter.get('/config', c.getConfig);
agencyRouter.put('/config', c.updateConfig);

// Projects
agencyRouter.get('/projects', c.listProjects);
agencyRouter.post('/projects', c.createProject);
agencyRouter.put('/projects/:id', c.updateProject);
agencyRouter.delete('/projects/:id', c.deleteProject);

// Assistente AI
agencyRouter.post('/ai/chat', c.aiChat);
agencyRouter.get('/ai/logs', c.aiLogs);

// Transactions
agencyRouter.get('/transactions', c.listTransactions);
agencyRouter.get('/transactions/export', c.exportCSV);
agencyRouter.post('/transactions', c.createTransaction);
agencyRouter.post('/transactions/recurring/generate', c.generateRecurring);
agencyRouter.put('/transactions/:id', c.updateTransaction);
agencyRouter.delete('/transactions/:id', c.deleteTransaction);
