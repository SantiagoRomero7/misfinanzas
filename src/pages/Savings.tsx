import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { SavingsGoal } from '@/types';
import { formatCurrency, getTodayColombia, formatDateColombia } from '@/lib/formatters';
import { Plus, Target, Check, Calendar, Pencil, Trash2, Wallet, PlusCircle } from 'lucide-react';
import { sanitize } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToastStore } from '@/store/useToastStore';
import { differenceInDays, parseISO } from 'date-fns';

type ContributionSource = 'balance' | 'additional';

interface ContributionRecord {
  amount: number;
  date: string;
  description: string | null;
}

// Simple Circular Progress Component
const CircularProgress = ({ percentage, color }: { percentage: number; color: string }) => {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center mx-auto mb-3 shrink-0" style={{ width: 80, height: 80 }}>
      <svg width="80" height="80" viewBox="0 0 80 80" className="transform -rotate-90">
        <circle
          cx="40" cy="40" r={radius}
          stroke="currentColor"
          strokeWidth="6" fill="transparent"
          className="text-slate-100"
        />
        <circle
          cx="40" cy="40" r={radius}
          stroke={color}
          strokeWidth="6" fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-slate-800">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
};

export const Savings = () => {
  const { addToast } = useToastStore();
  const { user } = useAuthStore();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit/Delete state
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [deleteConfirmGoal, setDeleteConfirmGoal] = useState<SavingsGoal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New goal form
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState(0);
  const [targetAmountDisplay, setTargetAmountDisplay] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState('#7C3AED'); // Default primary
  const [icon, setIcon] = useState('Target');

  // Contribution form
  const [contribution, setContribution] = useState(0);
  const [contributionDisplay, setContributionDisplay] = useState('');
  const [contributionSource, setContributionSource] = useState<ContributionSource>('balance');

  // Contribution history
  const [contributionHistory, setContributionHistory] = useState<ContributionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const formatInputAmount = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatInputAmount(e.target.value);
    setTargetAmountDisplay(formatted);
    setTargetAmount(Number(formatted.replace(/\./g, '')));
  };
  
  const handleContributionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatInputAmount(e.target.value);
    setContributionDisplay(formatted);
    setContribution(Number(formatted.replace(/\./g, '')));
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setGoals(data);
    }
    setLoading(false);
  };

  const fetchContributionHistory = async (goal: SavingsGoal) => {
    if (!user) return;
    setLoadingHistory(true);
    const { data } = await supabase
      .from('transactions')
      .select('amount, date, description')
      .eq('user_id', user.id)
      .eq('category', `Ahorro - ${goal.name}`)
      .order('date', { ascending: false })
      .limit(5);
    
    setContributionHistory(data || []);
    setLoadingHistory(false);
  };

  const resetGoalForm = () => {
    setName('');
    setTargetAmount(0);
    setTargetAmountDisplay('');
    setDeadline('');
    setColor('#7C3AED');
    setIcon('Target');
    setEditingGoal(null);
  };

  const openCreateModal = () => {
    resetGoalForm();
    setIsGoalModalOpen(true);
  };

  const openEditModal = (goal: SavingsGoal) => {
    console.log('Editing goal:', goal);
    setEditingGoal(goal);
    setName(goal.name);
    setTargetAmount(goal.target_amount);
    setTargetAmountDisplay(formatInputAmount(String(goal.target_amount)));
    setDeadline(goal.deadline || '');
    setColor(goal.color || '#7C3AED');
    setIcon(goal.icon || 'Target');
    setIsGoalModalOpen(true);
  };

  const openContributionModal = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setContribution(0);
    setContributionDisplay('');
    setContributionSource('balance');
    setIsContributionModalOpen(true);
    fetchContributionHistory(goal);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name || !targetAmount) return;

    setIsSubmitting(true);

    if (editingGoal) {
      // UPDATE existing goal
      const { error } = await supabase
        .from('savings_goals')
        .update({
          name: sanitize(name),
          target_amount: targetAmount,
          deadline: deadline || null,
          color,
          icon
        })
        .eq('id', editingGoal.id);

      setIsSubmitting(false);
      if (!error) {
        setIsGoalModalOpen(false);
        resetGoalForm();
        fetchGoals();
        addToast('Meta actualizada', 'success');
      } else {
        addToast('Error actualizando la meta', 'error');
      }
    } else {
      // INSERT new goal
      const { error } = await supabase.from('savings_goals').insert({
        user_id: user.id,
        name: sanitize(name),
        target_amount: targetAmount,
        current_amount: 0,
        deadline: deadline || null,
        color,
        icon
      });

      setIsSubmitting(false);
      if (!error) {
        setIsGoalModalOpen(false);
        resetGoalForm();
        fetchGoals();
        addToast('Meta guardada', 'success');
      } else {
        addToast('Error guardando la meta', 'error');
      }
    }
  };

  const handleDeleteGoal = async () => {
    if (!deleteConfirmGoal) return;
    setIsDeleting(true);

    const { error } = await supabase
      .from('savings_goals')
      .delete()
      .eq('id', deleteConfirmGoal.id);

    setIsDeleting(false);
    if (!error) {
      setGoals(goals.filter(g => g.id !== deleteConfirmGoal.id));
      setDeleteConfirmGoal(null);
      addToast('Meta eliminada', 'success');
    } else {
      addToast('Error eliminando la meta', 'error');
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !contribution || !user) return;

    setIsSubmitting(true);
    const newAmount = Number(selectedGoal.current_amount) + contribution;

    try {
      if (contributionSource === 'balance') {
        // PASO 1: Registrar transacción de gasto
        const { error: txError } = await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'expense',
          amount: contribution,
          category: `Ahorro - ${selectedGoal.name}`,
          description: `Aporte a meta: ${selectedGoal.name}`,
          date: getTodayColombia(),
        });

        if (txError) {
          setIsSubmitting(false);
          addToast('Error registrando la transacción', 'error');
          return;
        }

        // PASO 2: Sumar al progreso de la meta
        const { error: goalError } = await supabase
          .from('savings_goals')
          .update({ current_amount: newAmount })
          .eq('id', selectedGoal.id);

        setIsSubmitting(false);
        if (!goalError) {
          setIsContributionModalOpen(false);
          setContribution(0);
          setContributionDisplay('');
          setSelectedGoal(null);
          fetchGoals();
          addToast('✓ Aporte registrado y descontado de tu balance', 'success');
        } else {
          addToast('Error actualizando la meta', 'error');
        }
      } else {
        // Solo sumar al progreso de la meta
        const { error } = await supabase
          .from('savings_goals')
          .update({ current_amount: newAmount })
          .eq('id', selectedGoal.id);

        setIsSubmitting(false);
        if (!error) {
          setIsContributionModalOpen(false);
          setContribution(0);
          setContributionDisplay('');
          setSelectedGoal(null);
          fetchGoals();
          addToast('✓ Aporte registrado en tu meta', 'success');
        } else {
          addToast('Error agregando aporte', 'error');
        }
      }
    } catch {
      setIsSubmitting(false);
      addToast('Error inesperado', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-24 px-4 w-full h-full overflow-y-auto overflow-x-hidden min-h-screen-safe">
      <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Mis Metas</h2>
          <p className="text-sm text-slate-500">{goals.length} metas activas</p>
        </div>
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
          <Target size={24} />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-4">
              <Skeleton className="w-20 h-20 rounded-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white rounded-3xl border border-slate-100 shadow-sm animate-fade-in mt-2">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-50 mb-6 text-slate-300">
            <Target size={40} />
          </div>
          <h4 className="font-bold text-slate-800 mb-2 text-lg">No tienes metas de ahorro</h4>
          <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto">Define tus sueños y empieza a ahorrar para cumplirlos poco a poco.</p>
          <Button onClick={openCreateModal} className="px-8 shadow-lg shadow-primary/20">
            Crear primera meta
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 w-full">
          {goals.map(goal => {
            const pct = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
            const isCompleted = pct >= 100;
            const daysLeft = goal.deadline ? differenceInDays(parseISO(goal.deadline), parseISO(getTodayColombia())) : null;

            return (
              <button
                key={goal.id}
                onClick={() => openContributionModal(goal)}
                className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex flex-col items-center justify-between transition-transform hover:scale-[1.02] active:scale-[0.98] outline-none relative overflow-hidden w-full h-auto"
              >
                {/* Edit Button — top right */}
                <div
                  onClick={(e) => { e.stopPropagation(); openEditModal(goal); }}
                  className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-slate-100 hover:bg-primary/10 flex items-center justify-center text-slate-400 hover:text-primary transition-colors"
                >
                  <Pencil size={13} />
                </div>

                {/* Delete Button — top left */}
                <div
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmGoal(goal); }}
                  className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full bg-slate-100 hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={13} />
                </div>

                {isCompleted && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-success text-white px-2 py-0.5 rounded-b-xl text-[10px] font-bold flex items-center gap-1 z-10">
                    <Check size={12} /> Logrado
                  </div>
                )}
                
                <div className="mt-4">
                  <CircularProgress percentage={pct} color={goal.color || '#7C3AED'} />
                </div>
                
                <h3 className="font-bold text-slate-800 text-sm mb-1 truncate text-center">{goal.name}</h3>
                <p className="text-xs text-slate-500 text-center mb-3">
                  {formatCurrency(goal.current_amount)}<br/>
                  <span className="text-[10px]">de {formatCurrency(goal.target_amount)}</span>
                </p>

                {daysLeft !== null && !isCompleted && (
                  <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 bg-slate-50 py-1 rounded-lg">
                    <Calendar size={12} /> {daysLeft > 0 ? `${daysLeft} días` : 'Vencido'}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* FAB */}
      <button 
        onClick={openCreateModal}
        className="fixed bottom-20 right-5 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all z-40"
      >
        <Plus size={24} />
      </button>

      {/* Create/Edit Goal Modal */}
      <Modal isOpen={isGoalModalOpen} onClose={() => { setIsGoalModalOpen(false); resetGoalForm(); }} title={editingGoal ? 'Editar Meta' : 'Nueva Meta'}>
        <form onSubmit={handleSaveGoal} className="space-y-4 pb-4">
          <Input label="Nombre de la meta" required value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Viaje a Cancún" />
          <Input label="Monto Objetivo" type="text" inputMode="numeric" required value={targetAmountDisplay} onChange={handleTargetChange} placeholder="0" />
          <Input label="Fecha límite (Opcional)" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Color</label>
            <div className="flex gap-3">
              {['#7C3AED', '#10B981', '#3b82f6', '#ef4444', '#f59e0b', '#ec4899'].map(c => (
                <button
                  key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full focus:outline-none transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-300' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <Button type="submit" fullWidth isLoading={isSubmitting}>{editingGoal ? 'Guardar Cambios' : 'Crear Meta'}</Button>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteConfirmGoal}
        onClose={() => setDeleteConfirmGoal(null)}
        onConfirm={handleDeleteGoal}
        title="Eliminar Meta"
        description={`¿Estás seguro de que deseas eliminar la meta "${deleteConfirmGoal?.name}"? Esta acción no se puede deshacer.`}
        isLoading={isDeleting}
      />

      {/* Contribute Modal */}
      <Modal isOpen={isContributionModalOpen} onClose={() => {setIsContributionModalOpen(false); setSelectedGoal(null); setContributionHistory([]);}} title={selectedGoal ? `Agregar aporte a ${selectedGoal.name}` : 'Agregar Aporte'}>
        {selectedGoal && (
          <form onSubmit={handleContribute} className="space-y-5 pb-4">
            <div className="text-center mb-2">
              <CircularProgress 
                percentage={Math.min((selectedGoal.current_amount / selectedGoal.target_amount) * 100, 100)} 
                color={selectedGoal.color || '#7C3AED'} 
              />
              <p className="text-xs text-slate-400 mt-1">Faltan {formatCurrency(selectedGoal.target_amount - selectedGoal.current_amount)}</p>
            </div>
            
            <div className="relative inline-flex items-center w-full justify-center text-center">
              <span className="text-2xl font-bold text-slate-800 absolute left-8">$</span>
              <input
                type="text" inputMode="numeric" required
                value={contributionDisplay} onChange={handleContributionChange}
                className="text-4xl font-black text-center text-slate-800 bg-transparent w-full focus:outline-none px-12 border-b-2 border-slate-200 focus:border-primary pb-1"
                placeholder="0"
              />
            </div>

            {/* Source Selection */}
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-3">¿De dónde sale este dinero?</label>
              <div className="grid grid-cols-1 gap-3">
                {/* Option A: From Balance */}
                <button
                  type="button"
                  onClick={() => setContributionSource('balance')}
                  className="flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all duration-200 text-left"
                  style={{
                    borderColor: contributionSource === 'balance' ? '#7C3AED' : '#e2e8f0',
                    backgroundColor: contributionSource === 'balance' ? 'rgba(124, 58, 237, 0.06)' : 'transparent',
                  }}
                >
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200"
                    style={{ 
                      backgroundColor: contributionSource === 'balance' ? 'rgba(124, 58, 237, 0.15)' : '#f1f5f9',
                      color: contributionSource === 'balance' ? '#7C3AED' : '#94a3b8',
                    }}
                  >
                    <Wallet size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">De mi saldo actual</p>
                    <p className="text-xs text-slate-400">Se descontará de tu balance</p>
                  </div>
                  {/* Radio indicator */}
                  <div className="ml-auto shrink-0">
                    <div 
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-200"
                      style={{ 
                        borderColor: contributionSource === 'balance' ? '#7C3AED' : '#cbd5e1',
                      }}
                    >
                      {contributionSource === 'balance' && (
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#7C3AED' }} />
                      )}
                    </div>
                  </div>
                </button>

                {/* Option B: Additional Money */}
                <button
                  type="button"
                  onClick={() => setContributionSource('additional')}
                  className="flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all duration-200 text-left"
                  style={{
                    borderColor: contributionSource === 'additional' ? '#10B981' : '#e2e8f0',
                    backgroundColor: contributionSource === 'additional' ? 'rgba(16, 185, 129, 0.06)' : 'transparent',
                  }}
                >
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200"
                    style={{ 
                      backgroundColor: contributionSource === 'additional' ? 'rgba(16, 185, 129, 0.15)' : '#f1f5f9',
                      color: contributionSource === 'additional' ? '#10B981' : '#94a3b8',
                    }}
                  >
                    <PlusCircle size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">Es dinero adicional</p>
                    <p className="text-xs text-slate-400">No afecta tu balance actual</p>
                  </div>
                  {/* Radio indicator */}
                  <div className="ml-auto shrink-0">
                    <div 
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-200"
                      style={{ 
                        borderColor: contributionSource === 'additional' ? '#10B981' : '#cbd5e1',
                      }}
                    >
                      {contributionSource === 'additional' && (
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#10B981' }} />
                      )}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <Button type="submit" fullWidth isLoading={isSubmitting}>Guardar Aporte</Button>

            {/* Contribution History */}
            {(contributionHistory.length > 0 || loadingHistory) && (
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Aportes desde el saldo</p>
                {loadingHistory ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contributionHistory.map((record, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-xl">
                        <div>
                          <p className="text-xs text-slate-500">{formatDateColombia(record.date)}</p>
                        </div>
                        <p className="text-sm font-bold text-slate-800">{formatCurrency(record.amount)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
};
