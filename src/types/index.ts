export type TransactionType = 'income' | 'expense';
export type CategoryType = 'income' | 'expense' | 'both';

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string | null;
  date: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  color: string | null;
  icon: string | null;
  created_at: string;
}

export interface MonthlyBudget {
  id: string;
  user_id: string;
  month: string;
  category: string;
  limit_amount: number;
  period: 'weekly' | 'monthly';
}
