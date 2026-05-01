import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, getTodayColombia, formatDateColombia } from '@/lib/formatters';
import { getCategoryIcon, getCategoryColor } from '@/lib/constants';
import { TrendingUp, TrendingDown, Wallet, Plus } from 'lucide-react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

export const Dashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  
  // Real stats for Budget and Savings cards
  const [budgetPct, setBudgetPct] = useState(0);
  const [savingsPct, setSavingsPct] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, [user, location.pathname]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);

    const currentMonthStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit'
    }).format(new Date()).slice(0, 7);

    const getMonthRange = (monthStr: string) => {
      const date = new Date(monthStr + '-01T00:00:00');
      const firstDay = format(startOfMonth(date), 'yyyy-MM-dd');
      const lastDay = format(endOfMonth(date), 'yyyy-MM-dd');
      return { firstDay, lastDay };
    };

    const { firstDay: startStr, lastDay: endStr } = getMonthRange(currentMonthStr);

    // 1. Fetch Month Transactions
    const { data: txData } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startStr)
      .lte('date', endStr)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    let income = 0;
    let expense = 0;

    if (txData) {
      txData.forEach(t => {
        if (t.type === 'income') income += Number(t.amount);
        else expense += Number(t.amount);
      });
      setRecentTransactions(txData.slice(0, 5)); // show latest 5
    }

    setTotalIncome(income);
    setTotalExpense(expense);

    // 2. Fetch Budgets
    const { data: budgets } = await supabase
      .from('monthly_budgets')
      .select('limit_amount')
      .eq('user_id', user.id)
      .eq('month', currentMonthStr);

    const totalLimit = (budgets || []).reduce((acc, b) => acc + Number(b.limit_amount), 0);
    setBudgetPct(totalLimit > 0 ? Math.min((expense / totalLimit) * 100, 100) : 0);

    // 3. Fetch Savings Goals
    const { data: savings } = await supabase
      .from('savings_goals')
      .select('target_amount, current_amount')
      .eq('user_id', user.id);

    const totalTarget = (savings || []).reduce((acc, s) => acc + Number(s.target_amount), 0);
    const totalCurrent = (savings || []).reduce((acc, s) => acc + Number(s.current_amount), 0);
    setSavingsPct(totalTarget > 0 ? Math.min((totalCurrent / totalTarget) * 100, 100) : 0);

    setLoading(false);
  };

  const { isRefreshing, pullDistance } = usePullToRefresh(fetchDashboardData);

  const balance = totalIncome - totalExpense;

  if (loading) {
    return (
      <div className="space-y-6 pb-24 px-4 w-full h-full overflow-y-auto overflow-x-hidden min-h-screen-safe mt-2">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 px-4 w-full h-full overflow-y-auto overflow-x-hidden min-h-screen-safe">
      {/* Pull to Refresh Indicator */}
      {pullDistance > 0 && (
        <div 
          className="flex justify-center items-center py-2 transition-all overflow-hidden"
          style={{ height: pullDistance, opacity: pullDistance / 60 }}
        >
          <div className={`transition-transform duration-300 ${pullDistance > 60 ? 'rotate-180' : ''}`}>
            <Plus size={20} className="text-primary" />
          </div>
        </div>
      )}
      
      {/* Balance Summary */}
      <div className="bg-primary rounded-3xl py-6 px-5 sm:px-6 text-white shadow-lg shadow-primary/20 relative overflow-hidden w-full h-auto mt-2">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Wallet size={120} className="-mr-8 -mt-8" />
        </div>
        <div className="relative z-10 w-full">
          <p className="text-primary-foreground/80 text-sm font-medium mb-1">Balance del Mes</p>
          <h2 className="text-3xl font-bold break-words whitespace-normal leading-tight">
            {formatCurrency(balance)}
          </h2>
        </div>
        
        <div className="flex justify-between mt-6 pt-5 border-t border-white/20 relative z-10 w-full gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 text-primary-foreground/80 text-[10px] sm:text-xs mb-1">
              <TrendingUp size={14} className="text-success shrink-0" /> Ingresos
            </div>
            <p className="font-semibold text-sm sm:text-base truncate">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="flex-1 min-w-0 text-right sm:text-left">
            <div className="flex items-center justify-end sm:justify-start gap-1 text-primary-foreground/80 text-[10px] sm:text-xs mb-1">
              <TrendingDown size={14} className="text-expense shrink-0" /> Gastos
            </div>
            <p className="font-semibold text-sm sm:text-base truncate">{formatCurrency(totalExpense)}</p>
          </div>
        </div>
      </div>

      <h3 className="font-bold text-slate-800 text-lg px-1">Progreso</h3>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
        <Card className="w-full">
          <p className="text-[10px] sm:text-xs text-slate-500 font-medium mb-1">Presupuesto</p>
          <p className="text-base sm:text-lg font-bold text-slate-800">{budgetPct.toFixed(0)}%</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
            <div className={`h-1.5 rounded-full ${budgetPct > 90 ? 'bg-expense' : 'bg-primary'}`} style={{ width: `${budgetPct}%` }}></div>
          </div>
        </Card>
        <Card className="w-full">
          <p className="text-[10px] sm:text-xs text-slate-500 font-medium mb-1">Ahorros</p>
          <p className="text-base sm:text-lg font-bold text-slate-800">{savingsPct.toFixed(0)}%</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
            <div className="bg-success h-1.5 rounded-full" style={{ width: `${savingsPct}%` }}></div>
          </div>
        </Card>
      </div>
      
      <div className="flex justify-between items-center px-1 pt-2 w-full">
        <h3 className="font-bold text-slate-800 text-lg">Últimas Transacciones</h3>
        {recentTransactions.length > 0 && (
          <button onClick={() => navigate('/transactions')} className="text-primary text-sm font-medium hover:underline">Ver todas</button>
        )}
      </div>
      
      <div className="space-y-3 w-full">
        {recentTransactions.length === 0 ? (
          <div className="text-center py-16 px-6 bg-white rounded-3xl border border-slate-100 shadow-sm w-full mx-auto animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-50 mb-6 text-slate-300">
              <Wallet size={40} />
            </div>
            <h4 className="font-bold text-slate-800 mb-2 text-lg">Aún no tienes transacciones</h4>
            <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto">Comienza a registrar tus gastos e ingresos para tomar el control de tus finanzas.</p>
            <Button onClick={() => navigate('/transactions')} fullWidth className="shadow-lg shadow-primary/20">
              <Plus size={18} className="mr-2" /> Agregar transacción
            </Button>
          </div>
        ) : (
          recentTransactions.map((t) => {
            const Icon = getCategoryIcon(t.category);
            const color = getCategoryColor(t.category);
            const todayStr = getTodayColombia();
            
            const displayCat = t.category;

            return (
              <div key={t.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm w-full gap-2">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15`, color }}>
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{displayCat}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {t.description && <span className="text-[10px] sm:text-xs text-slate-500 truncate max-w-[80px] sm:max-w-[120px]">{t.description}</span>}
                      {t.description && <span className="text-slate-300">•</span>}
                      <span className="text-[10px] sm:text-xs text-slate-400">
                         {t.date === todayStr ? 'Hoy' : formatDateColombia(t.date).split(' ')[0]}
                      </span>
                    </div>
                  </div>
                </div>
                <p className={`font-bold text-sm sm:text-base shrink-0 truncate max-w-[100px] text-right ${t.type === 'income' ? 'text-success' : 'text-slate-800'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
