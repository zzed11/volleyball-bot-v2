import { Request, Response, NextFunction } from 'express';
import { getDbPool } from '../config/database';
import {
  FinancialTransaction,
  CreateTransactionDto,
  UpdateTransactionDto,
  BudgetItem,
  CreateBudgetItemDto,
  UpdateBudgetItemDto,
  CashFlowSummary,
  ProfitLossStatement,
  ExpenseCategory,
  CreateForecastDto,
} from '../models/financial';

export class FinancialController {
  /**
   * Get all expense categories
   */
  async getCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pool = getDbPool();
      const result = await pool.query<ExpenseCategory>(
        `SELECT * FROM expense_categories WHERE is_active = true ORDER BY name ASC`
      );
      res.json(result.rows);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all financial transactions
   */
  async getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { start_date, end_date, type } = req.query;
      const pool = getDbPool();

      let query = `
        SELECT ft.*, ec.name as category_name
        FROM financial_transactions ft
        LEFT JOIN expense_categories ec ON ft.category_id = ec.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 1;

      if (start_date) {
        query += ` AND ft.transaction_date >= $${paramCount}`;
        params.push(start_date);
        paramCount++;
      }

      if (end_date) {
        query += ` AND ft.transaction_date <= $${paramCount}`;
        params.push(end_date);
        paramCount++;
      }

      if (type && (type === 'income' || type === 'expense')) {
        query += ` AND ft.type = $${paramCount}`;
        params.push(type);
        paramCount++;
      }

      query += ` ORDER BY ft.transaction_date DESC, ft.id DESC`;

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new financial transaction
   */
  async createTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: CreateTransactionDto = req.body;

      if (!dto.transaction_date || !dto.type || dto.amount === undefined) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      if (dto.type !== 'income' && dto.type !== 'expense') {
        res.status(400).json({ error: 'Type must be income or expense' });
        return;
      }

      const pool = getDbPool();
      const result = await pool.query<FinancialTransaction>(
        `INSERT INTO financial_transactions
         (transaction_date, type, amount, category_id, game_id, description, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          dto.transaction_date,
          dto.type,
          dto.amount,
          dto.category_id || null,
          dto.game_id || null,
          dto.description || null,
          dto.notes || null,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a financial transaction
   */
  async updateTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdateTransactionDto = req.body;

      const updates: string[] = [];
      const values: any[] = [];
      let paramCounter = 1;

      if (dto.transaction_date !== undefined) {
        updates.push(`transaction_date = $${paramCounter}`);
        values.push(dto.transaction_date);
        paramCounter++;
      }

      if (dto.type !== undefined) {
        if (dto.type !== 'income' && dto.type !== 'expense') {
          res.status(400).json({ error: 'Type must be income or expense' });
          return;
        }
        updates.push(`type = $${paramCounter}`);
        values.push(dto.type);
        paramCounter++;
      }

      if (dto.amount !== undefined) {
        updates.push(`amount = $${paramCounter}`);
        values.push(dto.amount);
        paramCounter++;
      }

      if (dto.category_id !== undefined) {
        updates.push(`category_id = $${paramCounter}`);
        values.push(dto.category_id);
        paramCounter++;
      }

      if (dto.game_id !== undefined) {
        updates.push(`game_id = $${paramCounter}`);
        values.push(dto.game_id);
        paramCounter++;
      }

      if (dto.description !== undefined) {
        updates.push(`description = $${paramCounter}`);
        values.push(dto.description);
        paramCounter++;
      }

      if (dto.notes !== undefined) {
        updates.push(`notes = $${paramCounter}`);
        values.push(dto.notes);
        paramCounter++;
      }

      if (updates.length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      values.push(id);

      const pool = getDbPool();
      const result = await pool.query<FinancialTransaction>(
        `UPDATE financial_transactions
         SET ${updates.join(', ')}
         WHERE id = $${paramCounter}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a financial transaction
   */
  async deleteTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const pool = getDbPool();

      const result = await pool.query(
        'DELETE FROM financial_transactions WHERE id = $1',
        [id]
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get cash flow summary (weekly aggregation)
   */
  async getCashFlowSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { year } = req.query;
      const pool = getDbPool();

      let query = `SELECT * FROM cash_flow_summary`;
      const params: any[] = [];

      if (year) {
        query += ` WHERE EXTRACT(YEAR FROM week_start) = $1`;
        params.push(year);
      }

      query += ` ORDER BY week_start ASC`;

      const result = await pool.query<CashFlowSummary>(query, params);
      res.json(result.rows);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update weekly cash flow (replaces all transactions for a specific week)
   */
  async updateWeeklyCashFlow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { week_start, income, expenses } = req.body;

      if (!week_start) {
        res.status(400).json({ error: 'week_start is required' });
        return;
      }

      const pool = getDbPool();
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Calculate week end (week starts on Monday, ends on Sunday)
        const weekEnd = new Date(week_start);
        weekEnd.setDate(weekEnd.getDate() + 6);

        // Delete all existing transactions for this week
        await client.query(
          `DELETE FROM financial_transactions
           WHERE transaction_date >= $1 AND transaction_date <= $2`,
          [week_start, weekEnd.toISOString().split('T')[0]]
        );

        // Insert new income transaction if income > 0
        if (income && income > 0) {
          await client.query(
            `INSERT INTO financial_transactions (transaction_date, type, amount, description)
             VALUES ($1, 'income', $2, 'Weekly volleyball game income')`,
            [week_start, income]
          );
        }

        // Insert new expense transaction if expenses > 0
        if (expenses && expenses > 0) {
          // Get the "Other" category ID
          const categoryResult = await client.query(
            `SELECT id FROM expense_categories WHERE name = 'Other' LIMIT 1`
          );
          const categoryId = categoryResult.rows[0]?.id || null;

          await client.query(
            `INSERT INTO financial_transactions (transaction_date, type, amount, category_id, description)
             VALUES ($1, 'expense', $2, $3, 'Weekly expenses')`,
            [week_start, expenses, categoryId]
          );
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Weekly cash flow updated successfully' });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Profit & Loss statement (monthly aggregation)
   */
  async getProfitLossStatement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { year } = req.query;
      const pool = getDbPool();

      let query = `SELECT * FROM profit_loss_statement`;
      const params: any[] = [];

      if (year) {
        query += ` WHERE year = $1`;
        params.push(year);
      }

      query += ` ORDER BY month DESC`;

      const result = await pool.query<ProfitLossStatement>(query, params);
      res.json(result.rows);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all budget items
   */
  async getBudgetItems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { year } = req.query;
      const pool = getDbPool();

      let query = `
        SELECT bi.*, ec.name as category_name
        FROM budget_items bi
        LEFT JOIN expense_categories ec ON bi.category_id = ec.id
      `;
      const params: any[] = [];

      if (year) {
        query += ` WHERE bi.year = $1`;
        params.push(year);
      }

      query += ` ORDER BY bi.year DESC, bi.type ASC, bi.id DESC`;

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new budget item
   */
  async createBudgetItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: CreateBudgetItemDto = req.body;

      if (!dto.year || !dto.type || dto.amount === undefined) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const pool = getDbPool();
      const result = await pool.query<BudgetItem>(
        `INSERT INTO budget_items
         (year, type, category_id, amount, description, frequency, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          dto.year,
          dto.type,
          dto.category_id || null,
          dto.amount,
          dto.description || null,
          dto.frequency || null,
          dto.notes || null,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a budget item
   */
  async updateBudgetItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdateBudgetItemDto = req.body;

      const updates: string[] = [];
      const values: any[] = [];
      let paramCounter = 1;

      if (dto.year !== undefined) {
        updates.push(`year = $${paramCounter}`);
        values.push(dto.year);
        paramCounter++;
      }

      if (dto.type !== undefined) {
        updates.push(`type = $${paramCounter}`);
        values.push(dto.type);
        paramCounter++;
      }

      if (dto.category_id !== undefined) {
        updates.push(`category_id = $${paramCounter}`);
        values.push(dto.category_id);
        paramCounter++;
      }

      if (dto.amount !== undefined) {
        updates.push(`amount = $${paramCounter}`);
        values.push(dto.amount);
        paramCounter++;
      }

      if (dto.description !== undefined) {
        updates.push(`description = $${paramCounter}`);
        values.push(dto.description);
        paramCounter++;
      }

      if (dto.frequency !== undefined) {
        updates.push(`frequency = $${paramCounter}`);
        values.push(dto.frequency);
        paramCounter++;
      }

      if (dto.notes !== undefined) {
        updates.push(`notes = $${paramCounter}`);
        values.push(dto.notes);
        paramCounter++;
      }

      if (updates.length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      values.push(id);

      const pool = getDbPool();
      const result = await pool.query<BudgetItem>(
        `UPDATE budget_items
         SET ${updates.join(', ')}
         WHERE id = $${paramCounter}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Budget item not found' });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a budget item
   */
  async deleteBudgetItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const pool = getDbPool();

      const result = await pool.query('DELETE FROM budget_items WHERE id = $1', [id]);

      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Budget item not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create financial forecast
   */
  async createForecast(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: CreateForecastDto = req.body;

      const pool = getDbPool();
      const result = await pool.query(
        `INSERT INTO financial_forecasts
         (forecast_date, forecast_type, amount, confidence_level, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          dto.forecast_date,
          dto.forecast_type,
          dto.amount,
          dto.confidence_level || null,
          dto.notes || null,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get financial summary (dashboard stats)
   */
  async getFinancialSummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pool = getDbPool();

      // Get current year stats
      const currentYear = new Date().getFullYear();

      const result = await pool.query(`
        SELECT
          (SELECT COALESCE(SUM(amount), 0) FROM financial_transactions
           WHERE type = 'income' AND EXTRACT(YEAR FROM transaction_date) = $1) as total_income_ytd,
          (SELECT COALESCE(SUM(amount), 0) FROM financial_transactions
           WHERE type = 'expense' AND EXTRACT(YEAR FROM transaction_date) = $1) as total_expenses_ytd,
          (SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0)
           FROM financial_transactions
           WHERE EXTRACT(YEAR FROM transaction_date) = $1) as net_profit_ytd,
          (SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0)
           FROM financial_transactions) as current_balance,
          (SELECT COUNT(*) FROM financial_transactions
           WHERE EXTRACT(YEAR FROM transaction_date) = $1) as transaction_count_ytd
      `, [currentYear]);

      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
}
