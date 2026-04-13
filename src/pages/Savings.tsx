import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { SavingsGoal } from '@/types';
import { formatCurrency, getTodayColombia } from '@/lib/formatters';
import { Plus, Target, Check, Calendar } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { differenceInDays, parseISO } from 'date-fns';

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
  const { user } = useAuthStore();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New goal form
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState(0);
  const [targetAmountDisplay, setTargetAmountDisplay] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState('#7C3AED'); // Default primary

  // Contribution form
  const [contribution, setContribution] = useState(0);
  const [contributionDisplay, setContributionDisplay] = useState('');

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

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name || !targetAmount) return;

    setIsSubmitting(true);
    const { error } = await supabase.from('savings_goals').insert({
      user_id: user.id,
      name,
      target_amount: targetAmount,
      current_amount: 0,
      deadline: deadline || null,
      color,
      icon: 'Target' // Fixed for simplicity, can be dynamic
    });

    setIsSubmitting(false);
    if (!error) {
      setIsGoalModalOpen(false);
      setName('');
      setTargetAmount(0);
      setTargetAmountDisplay('');
      setDeadline('');
      fetchGoals();
    } else {
      alert('Error guardando la meta');
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !contribution) return;

    setIsSubmitting(true);
    const newAmount = Number(selectedGoal.current_amount) + contribution;
    
    const { error } = await supabase
      .from('savings_goals')
      .update({ current_amount: newAmount })
      .eq('id', selectedGoal.id);

    setIsSubmitting(false);
    if (!error) {
      setIsContributionModalOpen(false);
      setContribution(0);
      setContributionDisplay('');
      fetchGoals();
    } else {
      alert('Error agregando aporte');
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
          {[1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-200 animate-pulse rounded-3xl"></div>)}
        </div>
      ) : goals.length === 0 ? (
         <div className="text-center py-10">
           <p className="text-slate-500 font-medium">No tienes metas de ahorro.</p>
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
                onClick={() => { setSelectedGoal(goal); setIsContributionModalOpen(true); }}
                className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex flex-col items-center justify-between transition-transform hover:scale-[1.02] active:scale-[0.98] outline-none relative overflow-hidden w-full h-auto"
              >
                {isCompleted && (
                  <div className="absolute top-0 right-0 bg-success text-white px-2 py-1 rounded-bl-xl text-[10px] font-bold flex items-center gap-1 z-10">
                    <Check size={12} /> Logrado
                  </div>
                )}
                
                <CircularProgress percentage={pct} color={goal.color || '#7C3AED'} />
                
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
        onClick={() => setIsGoalModalOpen(true)}
        className="fixed bottom-20 right-5 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all z-40"
      >
        <Plus size={24} />
      </button>

      {/* New Goal Modal */}
      <Modal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} title="Nueva Meta">
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

          <Button type="submit" fullWidth isLoading={isSubmitting}>Crear Meta</Button>
        </form>
      </Modal>

      {/* Contribute Modal */}
      <Modal isOpen={isContributionModalOpen} onClose={() => {setIsContributionModalOpen(false); setSelectedGoal(null)}} title="Agregar Aporte">
        {selectedGoal && (
          <form onSubmit={handleContribute} className="space-y-5 pb-4">
            <div className="text-center mb-6">
              <p className="text-slate-500 text-sm">Aportar a</p>
              <h3 className="text-xl font-bold text-slate-800">{selectedGoal.name}</h3>
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
            <Button type="submit" fullWidth isLoading={isSubmitting}>Guardar Aporte</Button>
          </form>
        )}
      </Modal>
    </div>
  );
};
