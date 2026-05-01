import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { AuthGuard } from '@/components/layout/AuthGuard';

import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Transactions } from '@/pages/Transactions';
import { Budget } from '@/pages/Budget';
import { Savings } from '@/pages/Savings';
import { Reports } from '@/pages/Reports';
import { Profile } from '@/pages/Profile';
import { ResetPassword } from '@/pages/ResetPassword';
import { ToastContainer } from '@/components/ui/Toast';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { Button } from '@/components/ui/Button';
import { AlertCircle } from 'lucide-react';

function App() {
  const { setUser, setLoading } = useAuthStore();
  const { showWarning, timeLeft, keepSession } = useSessionTimeout();

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        <Route element={<AuthGuard />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/savings" element={<Savings />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
      <ToastContainer />

      {/* Session Timeout Warning */}
      {showWarning && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">¿Sigues ahí?</h3>
              <p className="text-slate-500">
                Tu sesión se cerrará en <span className="font-bold text-slate-800">{timeLeft} segundos</span> por inactividad.
              </p>
            </div>
            <Button onClick={keepSession} fullWidth size="lg">
              Mantener sesión activa
            </Button>
          </div>
        </div>
      )}
    </BrowserRouter>
  );
}

export default App;
