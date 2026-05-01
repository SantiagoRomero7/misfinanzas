import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Lock, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '@/store/useToastStore';

export const ResetPassword = () => {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({
      password: password
    });

    if (authError) {
      setError(authError.message);
      addToast(authError.message, 'error');
    } else {
      addToast('✓ Contraseña actualizada', 'success');
      navigate('/login');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-6 py-12 lg:px-8 pt-safe">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
            <Wallet className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-slate-900">
          Restablecer contraseña
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Ingresa tu nueva contraseña a continuación
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <Input
            label="Nueva contraseña"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock size={18} />}
            placeholder="••••••••"
          />

          <Input
            label="Confirmar contraseña"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            icon={<Lock size={18} />}
            placeholder="••••••••"
          />

          {error && (
            <div className="p-3 text-sm text-expense bg-expense/10 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <Button type="submit" fullWidth isLoading={loading}>
              Actualizar contraseña
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
