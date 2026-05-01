import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { Transaction, TransactionType } from '@/types';
import { formatCurrency, formatDateColombia, formatTimeColombia, getTodayColombia } from '@/lib/formatters';
import { getCategoryIcon, getCategoryColor, INCOME_CATEGORIES, EXPENSE_CATEGORIES, isOtrosCategory } from '@/lib/constants';
import { sanitize } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalendarIcon, FileText, Tag, Receipt } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToastStore } from '@/store/useToastStore';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
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
  
  const { addToast } = useToastStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState<TransactionType>('expense');
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
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getTodayColombia());

  const [customCategories, setCustomCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchTransactions();
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

  const fetchTransactions = async () => {
    if (!user) return;
    setLoading(true);
    
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    
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

  const { isRefreshing: _isRefreshing, pullDistance } = usePullToRefresh(fetchTransactions);

  const handleDeleteClick = (id: string) => {
    setTxToDelete(id);
    setIsConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!txToDelete) return;
    
    setIsDeleting(true);
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', txToDelete);
      
    setIsDeleting(false);
    setIsConfirmDeleteOpen(false);

    if (!error) {
      setTransactions(transactions.filter(t => t.id !== txToDelete));
      addToast('Transacción eliminada', 'success');
      setTxToDelete(null);
    } else {
      addToast('Error eliminando la transacción', 'error');
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !category) return;

    let finalCategory = category;

    if (isOtrosCategory(category) && customCategoryName.trim()) {
      const customName = sanitize(customCategoryName.trim());
      finalCategory = customName;

      // Check if category exists
      const { data: existing } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('name', customName)
        .single();
      
      if (!existing) {
        await supabase.from('categories').insert({
          user_id: user.id,
          name: customName,
          icon: 'Tag',
          color: '#8B5CF6',
          type: type === 'income' ? 'income' : 'expense'
        });
        // refetch to see it in modal later if needed
        fetchCustomCategories();
      }
    }

    setIsSubmitting(true);
    const { error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type,
        amount,
        category: finalCategory,
        description: sanitize(description),
        date: date || getTodayColombia(),
      });

    setIsSubmitting(false);
    if (!error) {
      setIsModalOpen(false);
      resetForm();
      fetchTransactions();
      addToast('Transacción guardada', 'success');
    } else {
      addToast('Error al guardar la transacción', 'error');
    }
  };

  const resetForm = () => {
    setType('expense');
    setAmount(0);
    setAmountDisplay('');
    setCategory('');
    setCustomCategoryName('');
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

  const baseCategories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const customCatsForType = customCategories.filter(c => c.type === type || c.type === 'both').map(c => ({
    name: c.name,
    icon: Tag,
    color: c.color || '#8B5CF6'
  }));
  const categoriesToList = [...baseCategories, ...customCatsForType];

  return (
    <div className="space-y-4 pb-24 px-4 w-full overflow-x-hidden">
      {/* Header Month Filter */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm mt-2">
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
          { id: 'all', label: 'Todos', count: transactions.length },
          { id: 'income', label: 'Ingresos', count: transactions.filter(t => t.type === 'income').length },
          { id: 'expense', label: 'Gastos', count: transactions.filter(t => t.type === 'expense').length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-1.5 text-[11px] sm:text-sm font-bold rounded-lg transition-all focus:outline-none flex items-center justify-center gap-1.5
              ${activeTab === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === tab.id ? 'bg-slate-100 text-slate-600' : 'bg-slate-300/30 text-slate-400'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

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

      {/* List */}
      <div className="space-y-5">
        {loading ? (
          <div className="space-y-3 mt-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex flex-col gap-2 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : Object.keys(groupedTransactions).length === 0 ? (
          <div className="text-center py-16 px-6 bg-white rounded-3xl border border-slate-100 shadow-sm animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-50 mb-6 text-slate-300">
              <Receipt size={40} />
            </div>
            <h4 className="font-bold text-slate-800 mb-2 text-lg">Sin transacciones en {format(currentMonth, 'MMMM', { locale: es })}</h4>
            <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto">No has registrado ningún movimiento este mes. ¡Empieza ahora!</p>
            <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="px-8 shadow-lg shadow-primary/20">
              Agregar primera transacción
            </Button>
          </div>
        ) : (
          Object.keys(groupedTransactions).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(dateKey => {
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
                    const displayCat = t.category;
                    
                    return (
                      <div key={t.id} className="flex flex-col sm:flex-row bg-white rounded-2xl border border-slate-100 shadow-sm group">
                        <div className="flex items-center justify-between p-4 flex-1">
                          <div className="flex items-center gap-4 flex-1 overflow-hidden">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm shrink-0" style={{ backgroundColor: `${color}15`, color }}>
                              <Icon size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-800 text-sm truncate">{displayCat}</p>
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
                            onClick={() => handleDeleteClick(t.id)}
                            className="ml-3 p-2 text-slate-300 hover:text-expense hover:bg-expense/10 rounded-full transition-colors hidden sm:block md:group-hover:block focus:outline-none"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div className="border-t border-slate-50 p-2 sm:hidden flex justify-end">
                          <button onClick={() => handleDeleteClick(t.id)} className="flex items-center gap-1 text-xs text-expense font-medium px-2 py-1 bg-expense/10 rounded-lg">
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
        onClick={() => { resetForm(); setIsModalOpen(true); }}
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
            <div className="grid grid-cols-4 gap-3 mb-2">
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
            
            {/* Custom Category Input for "Otros" */}
            {isOtrosCategory(category) && (
              <div className="mt-4 animate-fade-in">
                <Input
                  label="¿Cómo quieres llamar esta categoría?"
                  value={customCategoryName}
                  onChange={(e) => setCustomCategoryName(e.target.value)}
                  placeholder="Ej. Mascota, Gym, Médico"
                  icon={<Tag size={18} />}
                  required
                />
              </div>
            )}
          </div>

          {!isOtrosCategory(category) && (
            <Input
              label="Descripción (Opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Cena con amigos"
              icon={<FileText size={18} />}
            />
          )}

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

      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Transacción"
        description="¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer y afectará tus presupuestos."
        isLoading={isDeleting}
      />
    </div>
  );
};
