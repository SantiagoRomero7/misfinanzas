import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency } from '@/lib/formatters';
import { getCategoryIcon, getCategoryColor, EXPENSE_CATEGORIES } from '@/lib/constants';
import { Plus, Maximize, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { format } from 'date-fns';

type BudgetData = {
  id: string;
  category: string;
  limit_amount: number;
  spent_amount: number;
};

export const Budget = () => {
  const { user } = useAuthStore();
  const [budgets, setBudgets] = useState<BudgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const currentMonthStr = format(new Date(), 'yyyy-MM'); // Format used for limits

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editCategory, setEditCategory] = useState(EXPENSE_CATEGORIES[0].name);
  const [editLimit, setEditLimit] = useState(0);
  const [editLimitDisplay, setEditLimitDisplay] = useState('');

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

  useEffect(() => {
    fetchBudgets();
  }, [currentMonthStr]);

  const fetchBudgets = async () => {
    if (!user) return;
    setLoading(true);

    // 1. Fetch budget limits from monthly_budgets
    const { data: limitsData } = await supabase
      .from('monthly_budgets')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', currentMonthStr);

    // 2. Fetch expenses from transactions for this month to calculate spent amount
    const startStr = `${currentMonthStr}-01`;
    const endStr = `${currentMonthStr}-31`; // Approx
    const { data: txData } = await supabase
      .from('transactions')
      .select('category, amount')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('date', startStr)
      .lte('date', endStr);

    // 3. Aggregate expenses by category
    const spentMap: Record<string, number> = {};
    if (txData) {
      txData.forEach(tx => {
        if (!spentMap[tx.category]) spentMap[tx.category] = 0;
        spentMap[tx.category] += Number(tx.amount);
      });
    }

    // 4. Combine into final list
    const combined: BudgetData[] = (limitsData || []).map(b => ({
      id: b.id,
      category: b.category,
      limit_amount: Number(b.limit_amount),
      spent_amount: spentMap[b.category] || 0
    }));

    setBudgets(combined);
    setLoading(false);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editCategory || !editLimit) return;
    
    setIsSubmitting(true);
    
    // Upsert equivalent manual via check
    const existing = budgets.find(b => b.category === editCategory);
    let error;
    
    if (existing) {
      const res = await supabase.from('monthly_budgets').update({ limit_amount: editLimit }).eq('id', existing.id);
      error = res.error;
    } else {
      const res = await supabase.from('monthly_budgets').insert({
        user_id: user.id,
        month: currentMonthStr,
        category: editCategory,
        limit_amount: editLimit
      });
      error = res.error;
    }

    setIsSubmitting(false);
    if (!error) {
      setIsModalOpen(false);
      setEditLimit(0);
      setEditLimitDisplay('');
      fetchBudgets();
    } else {
      alert("Error guardando presupuesto.");
    }
  };

  const totalLimit = budgets.reduce((acc, b) => acc + b.limit_amount, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spent_amount, 0);
  const globalPct = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
  
  return (
    <div className="space-y-6 pb-24 px-4 w-full overflow-x-hidden">
      
      {/* Global Progress */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Presupuesto Global</h2>
        <p className="text-sm text-slate-500 mb-4 cursor-default">
          <span className="font-semibold text-slate-800">{formatCurrency(totalSpent)}</span> gastado de {formatCurrency(totalLimit)}
        </p>
        
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${globalPct > 90 ? 'bg-expense' : globalPct > 60 ? 'bg-yellow-500' : 'bg-primary'}`} 
            style={{ width: `${Math.min(globalPct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs font-semibold text-slate-400">
          <span>0%</span>
          <span className={globalPct > 90 ? 'text-expense' : ''}>{globalPct.toFixed(0)}%</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-lg">Por Categoría</h3>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1 text-sm font-semibold text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={16} /> Ajustar límites
        </button>
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          [1,2].map(i => <div key={i} className="h-24 bg-white/50 animate-pulse rounded-2xl"></div>)
        ) : budgets.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
            <p className="text-slate-500 font-medium">No hay presupuestos ajustados.</p>
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
                   
                   <Badge variant={isDanger ? 'expense' : isWarn ? 'neutral' : 'success'} className={isWarn ? 'bg-yellow-100 text-yellow-700' : ''}>
                     {isDanger ? <span className="flex items-center gap-1"><AlertTriangle size={12}/> Excedido</span> : isWarn ? 'Precaución' : <span className="flex items-center gap-1"><CheckCircle2 size={12}/> Al día</span>}
                   </Badge>
                 </div>
                 
                 <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                   <div 
                     className="h-full rounded-full transition-all duration-500" 
                     style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: isDanger ? '#EF4444' : isWarn ? '#eab308' : colorHex }}
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
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Categoría</label>
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
              {EXPENSE_CATEGORIES.map(cat => (
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
          </div>
          
          <Input
            label={`Límite mensual para ${editCategory}`}
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

    </div>
  );
};
