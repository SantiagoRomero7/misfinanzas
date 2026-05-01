import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency } from '@/lib/formatters';
import { getCategoryColor } from '@/lib/constants';
import { ChevronLeft, ChevronRight, BarChart3, PieChart } from 'lucide-react';
import { subMonths, addMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend } from 'recharts';

type TransactionData = { date: string; amount: number; type: string; category: string };

export const Reports = () => {
  const { user } = useAuthStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);

  const [customCategories, setCustomCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    fetchCustomCategories();
  }, [currentMonth]);

  const fetchCustomCategories = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id);
    if (data) setCustomCategories(data);
  };

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    
    // Fetch last 6 months to support the BarChart appropriately
    const sixMonthsAgo = format(subMonths(new Date(), 5), 'yyyy-MM-01');
    const { data } = await supabase
      .from('transactions')
      .select('date, amount, type, category, description')
      .eq('user_id', user.id)
      .gte('date', sixMonthsAgo);

    if (data) setTransactions(data);
    setLoading(false);
  };

  // 1. Process Bar Chart Data (Last 6 Months Income vs Expense)
  const barChartData = useMemo(() => {
    const dataMap: Record<string, { month: string, ingresos: number, gastos: number }> = {};
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
       const m = subMonths(new Date(), i);
       const key = format(m, 'yyyy-MM');
       dataMap[key] = { month: format(m, 'MMM', { locale: es }).toUpperCase(), ingresos: 0, gastos: 0 };
    }

    transactions.forEach(t => {
      const monthKey = t.date.substring(0, 7);
      if (dataMap[monthKey]) {
        if (t.type === 'income') dataMap[monthKey].ingresos += Number(t.amount);
        else dataMap[monthKey].gastos += Number(t.amount);
      }
    });

    return Object.values(dataMap);
  }, [transactions]);

  // 2. Process Pie Chart Data (Expenses by Category for SELECTED Month)
  const currentMonthStr = format(currentMonth, 'yyyy-MM');
  const pieChartData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonthStr));
    const grouped = expenses.reduce((acc, t) => {
      let catName = t.category;

      if (!acc[catName]) {
        const color = getCategoryColor(t.category);
        acc[catName] = { name: catName, value: 0, fill: color };
      }
      acc[catName].value += Number(t.amount);
      return acc;
    }, {} as Record<string, {name: string, value: number, fill: string}>);
    
    return Object.values(grouped).sort((a,b) => b.value - a.value); // Sort biggest first
  }, [transactions, currentMonthStr, customCategories]);

  // Summaries calculation
  const totalMonthExpense = pieChartData.reduce((acc, c) => acc + c.value, 0);
  const maxExpenseCategory = pieChartData[0]?.name || 'N/A';

  return (
    <div className="space-y-6 pb-24 px-4 w-full overflow-x-hidden">
      
      {/* Month Selector for specific reports (Pie chart) */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 text-slate-400 focus:outline-none">
          <ChevronLeft size={20} />
        </button>
        <span className="font-bold text-primary capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </span>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 text-slate-400 focus:outline-none">
          <ChevronRight size={20} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-64 bg-slate-200 animate-pulse rounded-3xl"></div>
          <div className="h-64 bg-slate-200 animate-pulse rounded-3xl"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500 font-medium mb-1">Gastos del mes</p>
              <p className="text-lg font-bold text-expense">{formatCurrency(totalMonthExpense)}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500 font-medium mb-1">Mayor gasto en</p>
              <p className="text-lg font-bold text-slate-800 truncate">{maxExpenseCategory}</p>
            </div>
          </div>

          {/* Pie Chart: Expenses By Category */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <PieChart size={18} className="text-primary"/> Gastos por Categoría
            </h3>
            
            {pieChartData.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-10">No hay gastos este mes</p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%" cy="45%"
                      innerRadius={60} outerRadius={80}
                      paddingAngle={5}
                      dataKey="value" stroke="none"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                    />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px' }} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Bar Chart: Income vs Expenses 6 months */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6">
              <BarChart3 size={18} className="text-primary"/> Últimos 6 Meses
            </h3>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(value) => `$${value/1000}k`} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    formatter={(value: any) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="ingresos" name="Ingresos" fill="#10B981" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="gastos" name="Gastos" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legend */}
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="w-3 h-3 rounded-sm bg-success"></div> Ingresos
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="w-3 h-3 rounded-sm bg-expense"></div> Gastos
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
