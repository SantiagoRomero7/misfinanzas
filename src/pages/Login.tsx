import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Mail, Lock, Wallet } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

export const Login = () => {
  const { user } = useAuthStore();
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    if (isLoginView) {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) setError(authError.message);
    } else {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (authError) {
        setError(authError.message);
      } else {
        setSuccess('¡Cuenta creada! Haz iniciado sesión.');
        // Si el correo requiere verificación, supabase devuelve success pero no sesión inmediata,
        // pero con default de Supabase, podría requerir confirmación por correo, avisemos amablemente.
      }
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
          MisFinanzas
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Controla tus finanzas personales fácilmente
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <Input
            label="Correo electrónico"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={18} />}
            placeholder="tu@correo.com"
          />

          <Input
            label="Contraseña"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock size={18} />}
            placeholder="••••••••"
          />

          {error && (
            <div className="p-3 text-sm text-expense bg-expense/10 rounded-lg">
              {error}
            </div>
          )}
          
          {success && (
            <div className="p-3 text-sm text-success bg-success/10 rounded-lg">
              {success}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <Button type="submit" fullWidth isLoading={loading}>
              {isLoginView ? 'Iniciar sesión' : 'Crear cuenta'}
            </Button>
            
            <p className="text-center text-sm text-slate-500 mt-2">
              {isLoginView ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
              <button 
                type="button" 
                onClick={() => setIsLoginView(!isLoginView)}
                className="font-semibold text-primary hover:underline focus:outline-none"
              >
                {isLoginView ? 'Regístrate aquí' : 'Inicia sesión'}
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
