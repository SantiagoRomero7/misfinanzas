import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { Transaction, TransactionType } from '@/types';
import { formatCurrency, formatDateColombia, formatTimeColombia, getTodayColombia } from '@/lib/formatters';
import { getCategoryIcon, getCategoryColor, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/constants';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalendarIcon, FileText } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { startOfMonth, endOfMonth, addMonths, subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';

export const Transactions = () => {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense'>('all');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState<TransactionType>('income');
  const [amount, setAmount] = useState(0);
  const [amountDisplay, setAmountDisplay] = useState('');

  const formatInputAmount = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatInputAmount(e.target.value);
    setAmountDisplay(formatted);
    setAmount(Number(formatted.replace(/\./g, '')));
  };
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getTodayColombia());

  useEffect(() => {
    fetchTransactions();
  }, [currentMonth]);

  const fetchTransactions = async () => {
    if (!user) return;
    setLoading(true);
    
    // Convert to UTC dates for Supabase filtering based on local month
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    
    // For date fields stored as YYYY-MM-DD, simple string comparison works too
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startStr)
      .lte('date', endStr)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTransactions(data);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta transacción?')) return;
    
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
      
    if (!error) {
      setTransactions(transactions.filter(t => t.id !== id));
    } else {
      alert('Error eliminando la transacción');
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !category) return;

    setIsSubmitting(true);
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      type,
      amount: amount,
      category,
      description,
      date: date || getTodayColombia()
    });

    setIsSubmitting(false);
    if (!error) {
      setIsModalOpen(false);
      resetForm();
      fetchTransactions();
    } else {
      alert('Error al guardar la transacción');
    }
  };

  const resetForm = () => {
    setType('income');
    setAmount(0);
    setAmountDisplay('');
    setCategory('');
    setDescription('');
    setDate(getTodayColombia());
  };

  const filteredTransactions = transactions.filter(t => 
    activeTab === 'all' ? true : t.type === activeTab
  );

  // Group by date
  const groupedTransactions = filteredTransactions.reduce((acc, t) => {
    const d = t.date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const categoriesToList = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="space-y-4 pb-24 px-4 w-full overflow-x-hidden">
      {/* Header Month Filter */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm">
        <button 
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 text-slate-400 hover:text-slate-600 focus:outline-none"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="font-semibold text-slate-800 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </span>
        <button 
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 text-slate-400 hover:text-slate-600 focus:outline-none"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-200/50 rounded-xl">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'income', label: 'Ingresos' },
          { id: 'expense', label: 'Gastos' }
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

      {/* List */}
      <div className="space-y-5">
        {loading ? (
          <div className="space-y-3 mt-4">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-200 animate-pulse rounded-2xl"></div>)}
          </div>
        ) : Object.keys(groupedTransactions).length === 0 ? (
          <div className="text-center py-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4 text-slate-400">
              <FileText size={32} />
            </div>
            <p className="text-slate-500 font-medium">No hay transacciones este mes.</p>
          </div>
        ) : (
          Object.keys(groupedTransactions).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(dateKey => {
            // Determine "Hoy", "Ayer" or Date string
            // Determine "Hoy" or Date string
            const todayStr = getTodayColombia();
            const isToday = dateKey === todayStr;
            let displayDate = formatDateColombia(dateKey);
            if (isToday) displayDate = "Hoy";

            return (
              <div key={dateKey} className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2">{displayDate}</h3>
                
                <div className="space-y-2">
                  {groupedTransactions[dateKey].map(t => {
                    const Icon = getCategoryIcon(t.category);
                    const color = getCategoryColor(t.category);
                    return (
                      <div key={t.id} className="flex flex-col sm:flex-row bg-white rounded-2xl border border-slate-100 shadow-sm group">
                        <div className="flex items-center justify-between p-4 flex-1">
                          <div className="flex items-center gap-4 flex-1 overflow-hidden">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: `${color}15`, color }}>
                              <Icon size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-800 text-sm truncate">{t.category}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {t.description && <span className="text-xs text-slate-500 truncate max-w-[120px]">{t.description}</span>}
                                {t.description && <span className="text-slate-300">•</span>}
                                <span className="text-xs text-slate-400">{formatTimeColombia(t.created_at)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end shrink-0 pl-2">
                            <p className={`font-bold ${t.type === 'income' ? 'text-success' : 'text-slate-800'}`}>
                              {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                            </p>
                          </div>
                          
                          <button 
                            onClick={() => handleDelete(t.id)}
                            className="ml-3 p-2 text-slate-300 hover:text-expense hover:bg-expense/10 rounded-full transition-colors hidden sm:block md:group-hover:block"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        {/* Mobile delete button below */}
                        <div className="border-t border-slate-50 p-2 sm:hidden flex justify-end">
                          <button onClick={() => handleDelete(t.id)} className="flex items-center gap-1 text-xs text-expense font-medium px-2 py-1 bg-expense/10 rounded-lg">
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-20 right-5 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all z-40"
      >
        <Plus size={24} />
      </button>

      {/* Add Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva Transacción">
        <form onSubmit={handleAddSubmit} className="space-y-5 pb-4">
          
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all focus:outline-none ${type === 'expense' ? 'bg-white text-expense shadow-sm' : 'text-slate-500'}`}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all focus:outline-none ${type === 'income' ? 'bg-white text-success shadow-sm' : 'text-slate-500'}`}
            >
              Ingreso
            </button>
          </div>

          <div className="text-center">
            <p className="text-slate-500 text-sm font-medium mb-2">Monto</p>
            <div className="relative inline-flex items-center">
              <span className="text-2xl font-bold text-slate-800 absolute left-2">$</span>
              <input
                type="text"
                inputMode="numeric"
                required
                value={amountDisplay}
                onChange={handleAmountChange}
                className="text-4xl font-black text-center text-slate-800 bg-transparent w-full focus:outline-none pl-8 border-b-2 border-slate-200 focus:border-primary pb-1 transition-colors"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <p className="text-slate-700 text-sm font-medium mb-3">Categoría</p>
            <div className="grid grid-cols-4 gap-3">
              {categoriesToList.map(cat => {
                const isSelected = category === cat.name;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all border-2
                      ${isSelected ? 'bg-slate-50' : 'border-transparent hover:bg-slate-50'}
                    `}
                    style={{ borderColor: isSelected ? cat.color : 'transparent' }}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                      <cat.icon size={20} />
                    </div>
                    <span className="text-[10px] font-medium text-slate-600 line-clamp-1">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label="Descripción (Opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej. Cena con amigos"
            icon={<FileText size={18} />}
          />

          <Input
            label="Fecha"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            icon={<CalendarIcon size={18} />}
          />

          <Button type="submit" fullWidth isLoading={isSubmitting}>
            Guardar {type === 'expense' ? 'Gasto' : 'Ingreso'}
          </Button>
        </form>
      </Modal>
    </div>
  );
};
