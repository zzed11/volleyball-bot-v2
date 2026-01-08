export interface ExpenseCategory {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export type TransactionType = 'income' | 'expense';

export interface FinancialTransaction {
  id: number;
  transaction_date: string;
  type: TransactionType;
  amount: number;
  category_id: number | null;
  category_name?: string;
  game_id: number | null;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionDto {
  transaction_date: string;
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
  category_name?: string;
  amount: number;
  description: string | null;
  frequency: BudgetFrequency | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
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
  week_start: string;
  total_income: number;
  total_expenses: number;
  net_cash_flow: number;
  running_balance: number;
}

export interface ProfitLossStatement {
  month: string;
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

export interface FinancialSummary {
  total_income_ytd: number;
  total_expenses_ytd: number;
  net_profit_ytd: number;
  current_balance: number;
  transaction_count_ytd: number;
}

export interface CreateForecastDto {
  forecast_date: string;
  forecast_type: string;
  amount: number;
  confidence_level?: number | null;
  notes?: string | null;
}
