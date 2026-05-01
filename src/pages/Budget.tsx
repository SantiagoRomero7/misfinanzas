import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency, getTodayColombia } from '@/lib/formatters';
import { getCategoryIcon, getCategoryColor, EXPENSE_CATEGORIES, isOtrosCategory } from '@/lib/constants';
import { sanitize } from '@/lib/utils';
import { Plus, Maximize, AlertTriangle, CheckCircle2, Tag, Target, Pencil, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToastStore } from '@/store/useToastStore';
import { format, startOfMonth, endOfMonth } from 'date-fns';

type BudgetData = {
  id: string;
  category: string;
  limit_amount: number;
  spent_amount: number;
  period: 'weekly' | 'monthly';
};

export const Budget = () => {
  const { user } = useAuthStore();
  const [budgets, setBudgets] = useState<BudgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const currentMonthStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit'
  }).format(new Date()).slice(0, 7);

  const { addToast } = useToastStore();
  const [activeTab, setActiveTab] = useState<'monthly' | 'weekly'>('monthly');
  const [isLoaded, setIsLoaded] = useState(false);

  const getMonthRange = (monthStr: string) => {
    const date = new Date(monthStr + '-01T00:00:00');
    const firstDay = format(startOfMonth(date), 'yyyy-MM-dd');
    const lastDay = format(endOfMonth(date), 'yyyy-MM-dd');
    return { firstDay, lastDay };
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<BudgetData | null>(null);
  
  const [editCategory, setEditCategory] = useState(EXPENSE_CATEGORIES[0].name);
  const [editLimit, setEditLimit] = useState(0);
  const [editLimitDisplay, setEditLimitDisplay] = useState('');
  const [editPeriod, setEditPeriod] = useState<'monthly' | 'weekly'>('monthly');
  const [customBudgetCategory, setCustomBudgetCategory] = useState('');
  const [customCategories, setCustomCategories] = useState<any[]>([]);
  const location = useLocation();

  const formatInputAmount = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatInputAmount(e.target.value);
    setEditLimitDisplay(formatted);
    const numericValue = formatted.replace(/\./g, '');
    setEditLimit(Number(numericValue));
  };

  const getWeekStartMonday = () => {
    // Start from today in Colombia
    const today = new Date(getTodayColombia() + 'T00:00:00');
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(today.setDate(diff));
    return format(monday, 'yyyy-MM-dd');
  };

  useEffect(() => {
    fetchBudgets();
    fetchCustomCategories();
  }, [currentMonthStr, activeTab, location.pathname]);

  const fetchCustomCategories = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id);
    if (data) setCustomCategories(data);
  };

  const fetchBudgets = async () => {
    if (!user) return;
    setLoading(true);

    // 1. Fetch budget limits from monthly_budgets
    const { data: limitsData } = await supabase
      .from('monthly_budgets')
      .select('*')
      .eq('user_id', user.id)
      .eq('period', activeTab)
      .eq('month', currentMonthStr); // Even if weekly, we store current month context for grouping

    // Determine date range for expenses
    let startStr, endStr;
    if (activeTab === 'weekly') {
      startStr = getWeekStartMonday();
      endStr = getTodayColombia(); // up to today
    } else {
      const { firstDay, lastDay } = getMonthRange(currentMonthStr);
      startStr = firstDay;
      endStr = lastDay;
    }

    // 2. Fetch expenses from transactions
    const { data: txData } = await supabase
      .from('transactions')
      .select('category, description, amount')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('date', startStr)
      .lte('date', endStr);

    // 3. Aggregate expenses by category
    const spentMap: Record<string, number> = {};
    if (txData) {
      txData.forEach(tx => {
        const key = tx.category;
        spentMap[key] = (spentMap[key] || 0) + Number(tx.amount);
      });
    }

    console.log('Month range:', startStr, endStr);
    console.log('Transactions found:', txData?.length);
    console.log('Spent by category:', JSON.stringify(spentMap, null, 2));
    console.log('Budgets from DB:', JSON.stringify(limitsData, null, 2));

    // 4. Combine into final list
    const combined: BudgetData[] = (limitsData || []).map(b => ({
      id: b.id,
      category: b.category,
      limit_amount: Number(b.limit_amount),
      spent_amount: spentMap[b.category] || 0,
      period: b.period
    }));

    setBudgets(combined);
    setLoading(false);
    setTimeout(() => setIsLoaded(true), 100);
  };

  const handleOpenModal = () => {
    setEditingId(null);
    setEditCategory(EXPENSE_CATEGORIES[0].name);
    setEditLimit(0);
    setEditLimitDisplay('');
    setCustomBudgetCategory('');
    setEditPeriod(activeTab);
    setIsModalOpen(true);
  };

  const handleEditClick = (budget: BudgetData) => {
    setEditingId(budget.id);
    setEditCategory(budget.category);
    setEditLimit(budget.limit_amount);
    setEditLimitDisplay(formatInputAmount(String(budget.limit_amount)));
    setEditPeriod(budget.period);
    
    const isBase = baseCategories.some(c => c.name === budget.category);
    if (!isBase) {
      setEditCategory('Otros');
      setCustomBudgetCategory(budget.category);
    }
    
    setIsModalOpen(true);
  };

  const handleDeleteClick = (budget: BudgetData) => {
    setBudgetToDelete(budget);
    setIsConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!budgetToDelete) return;
    setIsDeleting(true);
    const { error } = await supabase.from('monthly_budgets').delete().eq('id', budgetToDelete.id);
    setIsDeleting(false);
    setIsConfirmDeleteOpen(false);
    if (!error) {
      addToast('Límite eliminado', 'success');
      fetchBudgets();
    } else {
      addToast('Error al eliminar', 'error');
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editCategory || !editLimit) return;
    
    let finalCategory = editCategory;
    if (isOtrosCategory(editCategory) && customBudgetCategory.trim()) {
      finalCategory = sanitize(customBudgetCategory.trim());
    }

    setIsSubmitting(true);
    let budgetError;
    
    if (editingId) {
      const res = await supabase.from('monthly_budgets').update({ 
        limit_amount: editLimit,
        category: finalCategory,
        period: editPeriod
      }).eq('id', editingId);
      budgetError = res.error;
    } else {
      const existing = budgets.find(b => b.category === finalCategory && b.period === editPeriod);
      if (existing) {
        const res = await supabase.from('monthly_budgets').update({ limit_amount: editLimit }).eq('id', existing.id);
        budgetError = res.error;
      } else {
        const res = await supabase.from('monthly_budgets').insert({
          user_id: user.id,
          month: currentMonthStr,
          category: finalCategory,
          limit_amount: editLimit,
          period: editPeriod
        });
        budgetError = res.error;
      }
    }

    setIsSubmitting(false);
    if (!budgetError) {
      setIsModalOpen(false);
      setEditLimit(0);
      setEditLimitDisplay('');
      setCustomBudgetCategory('');
      fetchBudgets();
      addToast('Límite actualizado', 'success');
    } else {
      addToast('Error al guardar presupuesto', 'error');
    }
  };

  const totalLimit = budgets.reduce((acc, b) => acc + b.limit_amount, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spent_amount, 0);
  const globalPct = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
  
  const baseCategories = EXPENSE_CATEGORIES;
  const customCats = customCategories.filter(c => c.type === 'expense' || c.type === 'both').map(c => ({
    name: c.name,
    icon: Tag,
    color: c.color || '#8B5CF6'
  }));
  const categoriesToList = [...baseCategories, ...customCats];

  return (
    <div className="space-y-6 pb-24 px-4 w-full overflow-x-hidden">
      
      {/* Global Progress */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mt-2">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Presupuesto Global</h2>
        <p className="text-sm text-slate-500 mb-4 cursor-default">
          <span className="font-semibold text-slate-800">{formatCurrency(totalSpent)}</span> gastado de {formatCurrency(totalLimit)}
        </p>
        
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-700 ease-out ${globalPct > 90 ? 'bg-expense' : globalPct > 60 ? 'bg-yellow-500' : 'bg-primary'}`} 
            style={{ width: `${isLoaded ? Math.min(globalPct, 100) : 0}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs font-semibold text-slate-400">
          <span>0%</span>
          <span className={globalPct > 90 ? 'text-expense' : ''}>{globalPct.toFixed(0)}%</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-200/50 rounded-xl">
        {[
          { id: 'monthly', label: 'Mensual' },
          { id: 'weekly', label: 'Semanal' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all focus:outline-none 
              ${activeTab === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-lg">Por Categoría</h3>
        <button 
          onClick={handleOpenModal}
          className="flex items-center gap-1 text-sm font-semibold text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={16} /> Ajustar límites
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16 rounded-lg" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : budgets.length === 0 ? (
          <div className="text-center py-16 px-6 bg-white rounded-3xl border border-slate-100 shadow-sm animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-50 mb-6 text-slate-300">
              <Target size={40} />
            </div>
            <h4 className="font-bold text-slate-800 mb-2 text-lg">No tienes límites configurados</h4>
            <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto">Define cuánto quieres gastar por categoría para mantener tus finanzas bajo control.</p>
            <Button onClick={handleOpenModal} className="px-8 shadow-lg shadow-primary/20">
              Crear primer límite
            </Button>
          </div>
        ) : (
          budgets.map(b => {
             const pct = b.limit_amount > 0 ? (b.spent_amount / b.limit_amount) * 100 : 0;
             const isDanger = pct > 90;
             const isWarn = pct > 60 && pct <= 90;
             const colorHex = getCategoryColor(b.category);
             const Icon = getCategoryIcon(b.category);
             
             return (
               <div key={b.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                 <div className="flex justify-between items-start mb-3">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${colorHex}15`, color: colorHex }}>
                       <Icon size={20} />
                     </div>
                     <div>
                       <h4 className="font-bold text-slate-800 text-sm">{b.category}</h4>
                       <p className="text-xs text-slate-500 mt-0.5">{formatCurrency(b.spent_amount)} de {formatCurrency(b.limit_amount)}</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                      <Badge variant={isDanger ? 'expense' : isWarn ? 'neutral' : 'success'} className={isWarn ? 'bg-yellow-100 text-yellow-700' : ''}>
                        {isDanger ? <span className="flex items-center gap-1"><AlertTriangle size={12}/> Excedido</span> : isWarn ? 'Precaución' : <span className="flex items-center gap-1"><CheckCircle2 size={12}/> Al día</span>}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEditClick(b)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDeleteClick(b)} className="p-1.5 text-slate-400 hover:text-expense hover:bg-expense/5 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                 </div>
                 
                 <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                   <div 
                     className="h-full rounded-full transition-all duration-700 ease-out" 
                     style={{ width: `${isLoaded ? Math.min(pct, 100) : 0}%`, backgroundColor: isDanger ? '#EF4444' : isWarn ? '#eab308' : colorHex }}
                   />
                 </div>
               </div>
             )
          })
        )}
      </div>

      {/* Edit Budget Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Asignar Presupuesto">
        <form onSubmit={handleSaveBudget} className="space-y-5 pb-4">
          
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setEditPeriod('monthly')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all focus:outline-none ${editPeriod === 'monthly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => setEditPeriod('weekly')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all focus:outline-none ${editPeriod === 'weekly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
            >
              Semanal
            </button>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Categoría</label>
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 mb-2">
              {categoriesToList.map(cat => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setEditCategory(cat.name)}
                  className={`flex flex-col items-center gap-1.5 p-2 border-2 rounded-xl text-xs font-medium transition-colors
                    ${editCategory === cat.name ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-600 hover:bg-slate-50'}
                  `}
                >
                  <cat.icon size={18} className={editCategory === cat.name ? 'text-primary' : 'text-slate-400'}/>
                  {cat.name}
                </button>
              ))}
            </div>
            
            {isOtrosCategory(editCategory) && (
              <div className="mt-3 animate-fade-in">
                <Input 
                  label="¿Cómo quieres llamar esta categoría?" 
                  value={customBudgetCategory}
                  onChange={e => setCustomBudgetCategory(e.target.value)}
                  placeholder="Ej. Mascota, Gym..."
                  required
                />
              </div>
            )}
          </div>
          
          <Input
            label={`Límite ${editPeriod === 'weekly' ? 'semanal' : 'mensual'} para ${isOtrosCategory(editCategory) && customBudgetCategory ? customBudgetCategory : editCategory}`}
            type="text"
            inputMode="numeric"
            required
            value={editLimitDisplay}
            onChange={handleAmountChange}
            placeholder="0"
            icon={<Maximize size={18} />}
          />
          
          <Button type="submit" fullWidth isLoading={isSubmitting}>Guardar Límite</Button>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Límite"
        description={`¿Estás seguro de que deseas eliminar el límite para "${budgetToDelete?.category}"?`}
        isLoading={isDeleting}
      />

    </div>
  );
};
