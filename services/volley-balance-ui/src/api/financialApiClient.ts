import {
  ExpenseCategory,
  FinancialTransaction,
  CreateTransactionDto,
  UpdateTransactionDto,
  CashFlowSummary,
  ProfitLossStatement,
  BudgetItem,
  CreateBudgetItemDto,
  UpdateBudgetItemDto,
  FinancialSummary,
  CreateForecastDto,
} from '@/types/financial';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

class FinancialApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/financial`;
  }

  /**
   * Get all expense categories
   */
  async getCategories(): Promise<ExpenseCategory[]> {
    const response = await fetch(`${this.baseUrl}/categories`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    return response.json();
  }

  /**
   * Get transactions with optional filters
   */
  async getTransactions(filters?: {
    start_date?: string;
    end_date?: string;
    type?: 'income' | 'expense';
  }): Promise<FinancialTransaction[]> {
    const params = new URLSearchParams();
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.type) params.append('type', filters.type);

    const url = `${this.baseUrl}/transactions${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }
    return response.json();
  }

  /**
   * Create a new transaction
   */
  async createTransaction(transaction: CreateTransactionDto): Promise<FinancialTransaction> {
    const response = await fetch(`${this.baseUrl}/transactions`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create transaction' }));
      throw new Error(error.error || 'Failed to create transaction');
    }
    return response.json();
  }

  /**
   * Update a transaction
   */
  async updateTransaction(id: number, updates: UpdateTransactionDto): Promise<FinancialTransaction> {
    const response = await fetch(`${this.baseUrl}/transactions/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update transaction' }));
      throw new Error(error.error || 'Failed to update transaction');
    }
    return response.json();
  }

  /**
   * Delete a transaction
   */
  async deleteTransaction(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/transactions/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete transaction' }));
      throw new Error(error.error || 'Failed to delete transaction');
    }
  }

  /**
   * Get cash flow summary
   */
  async getCashFlowSummary(year?: number): Promise<CashFlowSummary[]> {
    const url = year
      ? `${this.baseUrl}/cash-flow?year=${year}`
      : `${this.baseUrl}/cash-flow`;
    const response = await fetch(url, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch cash flow summary');
    }
    return response.json();
  }

  /**
   * Update weekly cash flow (income and expenses)
   */
  async updateWeeklyCashFlow(weekStart: string, income: number, expenses: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/cash-flow/week`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_start: weekStart, income, expenses }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update weekly cash flow' }));
      throw new Error(error.error || 'Failed to update weekly cash flow');
    }
  }

  /**
   * Get P&L statement
   */
  async getProfitLossStatement(year?: number): Promise<ProfitLossStatement[]> {
    const url = year
      ? `${this.baseUrl}/profit-loss?year=${year}`
      : `${this.baseUrl}/profit-loss`;
    const response = await fetch(url, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch P&L statement');
    }
    return response.json();
  }

  /**
   * Get budget items
   */
  async getBudgetItems(year?: number): Promise<BudgetItem[]> {
    const url = year ? `${this.baseUrl}/budget?year=${year}` : `${this.baseUrl}/budget`;
    const response = await fetch(url, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch budget items');
    }
    return response.json();
  }

  /**
   * Create budget item
   */
  async createBudgetItem(item: CreateBudgetItemDto): Promise<BudgetItem> {
    const response = await fetch(`${this.baseUrl}/budget`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create budget item' }));
      throw new Error(error.error || 'Failed to create budget item');
    }
    return response.json();
  }

  /**
   * Update budget item
   */
  async updateBudgetItem(id: number, updates: UpdateBudgetItemDto): Promise<BudgetItem> {
    const response = await fetch(`${this.baseUrl}/budget/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update budget item' }));
      throw new Error(error.error || 'Failed to update budget item');
    }
    return response.json();
  }

  /**
   * Delete budget item
   */
  async deleteBudgetItem(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/budget/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete budget item' }));
      throw new Error(error.error || 'Failed to delete budget item');
    }
  }

  /**
   * Get financial summary
   */
  async getFinancialSummary(): Promise<FinancialSummary> {
    const response = await fetch(`${this.baseUrl}/summary`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch financial summary');
    }
    return response.json();
  }

  /**
   * Create forecast
   */
  async createForecast(forecast: CreateForecastDto): Promise<any> {
    const response = await fetch(`${this.baseUrl}/forecasts`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forecast),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create forecast' }));
      throw new Error(error.error || 'Failed to create forecast');
    }
    return response.json();
  }
}

export const financialApi = new FinancialApiClient();
