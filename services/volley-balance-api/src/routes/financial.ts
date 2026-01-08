import { Router } from 'express';
import { FinancialController } from '../controllers/financialController';

const router = Router();
const controller = new FinancialController();

// Expense categories
router.get('/categories', controller.getCategories.bind(controller));

// Transactions
router.get('/transactions', controller.getTransactions.bind(controller));
router.post('/transactions', controller.createTransaction.bind(controller));
router.patch('/transactions/:id', controller.updateTransaction.bind(controller));
router.delete('/transactions/:id', controller.deleteTransaction.bind(controller));

// Reports
router.get('/cash-flow', controller.getCashFlowSummary.bind(controller));
router.put('/cash-flow/week', controller.updateWeeklyCashFlow.bind(controller));
router.get('/profit-loss', controller.getProfitLossStatement.bind(controller));
router.get('/summary', controller.getFinancialSummary.bind(controller));

// Budget
router.get('/budget', controller.getBudgetItems.bind(controller));
router.post('/budget', controller.createBudgetItem.bind(controller));
router.patch('/budget/:id', controller.updateBudgetItem.bind(controller));
router.delete('/budget/:id', controller.deleteBudgetItem.bind(controller));

// Forecasts
router.post('/forecasts', controller.createForecast.bind(controller));

export default router;
