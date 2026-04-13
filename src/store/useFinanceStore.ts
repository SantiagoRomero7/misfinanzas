import { create } from 'zustand';
import { Transaction, Category, SavingsGoal, MonthlyBudget } from '@/types';

interface FinanceState {
  transactions: Transaction[];
  categories: Category[];
  savingsGoals: SavingsGoal[];
  budgets: MonthlyBudget[];
  isLoading: boolean;
  
  setTransactions: (transactions: Transaction[]) => void;
  setCategories: (categories: Category[]) => void;
  setSavingsGoals: (goals: SavingsGoal[]) => void;
  setBudgets: (budgets: MonthlyBudget[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useFinanceStore = create<FinanceState>((set) => ({
  transactions: [],
  categories: [],
  savingsGoals: [],
  budgets: [],
  isLoading: false,
  
  setTransactions: (transactions) => set({ transactions }),
  setCategories: (categories) => set({ categories }),
  setSavingsGoals: (goals) => set({ savingsGoals: goals }),
  setBudgets: (budgets) => set({ budgets }),
  setLoading: (isLoading) => set({ isLoading }),
}));
