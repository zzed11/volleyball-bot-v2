export interface ExpenseCategory {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
}

export type TransactionType = 'income' | 'expense';

export interface FinancialTransaction {
  id: number;
  transaction_date: Date;
  type: TransactionType;
  amount: number;
  category_id: number | null;
  game_id: number | null;
  description: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTransactionDto {
  transaction_date: string; // ISO date string
  type: TransactionType;
  amount: number;
  category_id?: number | null;
  game_id?: number | null;
  description?: string | null;
  notes?: string | null;
}

export interface UpdateTransactionDto extends Partial<CreateTransactionDto> {}

export type BudgetFrequency = 'weekly' | 'monthly' | 'yearly' | 'one-time';

export interface BudgetItem {
  id: number;
  year: number;
  type: TransactionType;
  category_id: number | null;
  amount: number;
  description: string | null;
  frequency: BudgetFrequency | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBudgetItemDto {
  year: number;
  type: TransactionType;
  category_id?: number | null;
  amount: number;
  description?: string | null;
  frequency?: BudgetFrequency | null;
  notes?: string | null;
}

export interface UpdateBudgetItemDto extends Partial<CreateBudgetItemDto> {}

export interface CashFlowSummary {
  week_start: Date;
  total_income: number;
  total_expenses: number;
  net_cash_flow: number;
  running_balance: number;
}

export interface ProfitLossStatement {
  month: Date;
  year: number;
  month_num: number;
  revenue: number;
  tournament_prizes: number;
  hall_costs: number;
  equipment_costs: number;
  trainer_costs: number;
  treats_costs: number;
  other_expenses: number;
  total_expenses: number;
  net_profit: number;
}

export interface FinancialForecast {
  id: number;
  forecast_date: Date;
  forecast_type: string;
  amount: number;
  confidence_level: number | null;
  notes: string | null;
  created_at: Date;
}

export interface CreateForecastDto {
  forecast_date: string;
  forecast_type: string;
  amount: number;
  confidence_level?: number | null;
  notes?: string | null;
}
