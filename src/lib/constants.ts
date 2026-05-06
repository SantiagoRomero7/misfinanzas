import { UtensilsCrossed, Car, Home, Heart, Tv, ShoppingBag, BookOpen, Zap, MoreHorizontal, Briefcase, Laptop, TrendingUp, Gift, Plus, Tag, PiggyBank, LucideIcon } from 'lucide-react';

export type CategoryDefinition = {
  name: string;
  icon: LucideIcon;
  color: string;
}

export const EXPENSE_CATEGORIES: CategoryDefinition[] = [
  { name: 'Alimentación', icon: UtensilsCrossed, color: '#f59e0b' },
  { name: 'Transporte', icon: Car, color: '#3b82f6' },
  { name: 'Vivienda', icon: Home, color: '#8b5cf6' },
  { name: 'Salud', icon: Heart, color: '#ef4444' },
  { name: 'Entretenimiento', icon: Tv, color: '#ec4899' },
  { name: 'Ropa', icon: ShoppingBag, color: '#14b8a6' },
  { name: 'Educación', icon: BookOpen, color: '#6366f1' },
  { name: 'Servicios', icon: Zap, color: '#eab308' },
  { name: 'Otros G.', icon: MoreHorizontal, color: '#64748b' },
];

export const INCOME_CATEGORIES: CategoryDefinition[] = [
  { name: 'Salario', icon: Briefcase, color: '#10b981' },
  { name: 'Freelance', icon: Laptop, color: '#0ea5e9' },
  { name: 'Inversiones', icon: TrendingUp, color: '#8b5cf6' },
  { name: 'Regalo', icon: Gift, color: '#f43f5e' },
  { name: 'Otros I.', icon: Plus, color: '#64748b' },
];

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export const getCategoryIcon = (categoryName: string) => {
  if (categoryName.startsWith('Ahorro -')) return PiggyBank;
  const category = ALL_CATEGORIES.find(c => c.name === categoryName);
  return category ? category.icon : Tag;
};

export const getCategoryColor = (categoryName: string) => {
  if (categoryName.startsWith('Ahorro -')) return '#10B981';
  const category = ALL_CATEGORIES.find(c => c.name === categoryName);
  return category ? category.color : '#8B5CF6';
};

export const isOtrosCategory = (name: string) => {
  return name === 'Otros G.' || name === 'Otros I.';
};
