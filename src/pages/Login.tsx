import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Mail, Lock, Wallet } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useToastStore } from '@/store/useToastStore';

export const Login = () => {
  const { addToast } = useToastStore();
  const { user } = useAuthStore();
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [attempts, setAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const savedAttempts = localStorage.getItem('login_attempts');
    const savedLockout = localStorage.getItem('login_lockout');
    
    if (savedAttempts) setAttempts(parseInt(savedAttempts));
    if (savedLockout) {
      const remaining = Math.ceil((parseInt(savedLockout) - Date.now()) / 1000);
      if (remaining > 0) {
        setLockoutTime(parseInt(savedLockout));
        setTimeLeft(remaining);
      } else {
        localStorage.removeItem('login_lockout');
      }
    }
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setLockoutTime(null);
            localStorage.removeItem('login_lockout');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timeLeft]);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    if (isLoginView) {
      if (timeLeft > 0) {
        setLoading(false);
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        localStorage.setItem('login_attempts', newAttempts.toString());

        if (newAttempts >= 5) {
          const lockout = Date.now() + 30000;
          setLockoutTime(lockout);
          setTimeLeft(30);
          localStorage.setItem('login_lockout', lockout.toString());
          addToast('Demasiados intentos. Bloqueado por 30s.', 'error');
        } else {
          setError(authError.message);
          addToast(authError.message, 'error');
        }
      } else {
        // Success
        setAttempts(0);
        localStorage.removeItem('login_attempts');
        localStorage.removeItem('login_lockout');
      }
    } else {
      // Sign up... (keeping existing logic but could add rate limit here too if needed)
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (authError) {
        setError(authError.message);
        addToast(authError.message, 'error');
      } else {
        addToast('¡Cuenta creada! Haz iniciado sesión.', 'success');
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
            <Button type="submit" fullWidth isLoading={loading} disabled={timeLeft > 0}>
              {timeLeft > 0 ? `Intenta de nuevo en ${timeLeft}s...` : (isLoginView ? 'Iniciar sesión' : 'Crear cuenta')}
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
