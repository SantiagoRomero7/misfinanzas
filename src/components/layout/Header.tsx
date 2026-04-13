
import { useAuthStore } from '@/store/useAuthStore';
import { LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Helper to get initials
const getInitials = (email?: string) => email?.slice(0, 2).toUpperCase() || 'U';

export const Header = () => {
  const { user } = useAuthStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 pt-safe">
      <div className="flex items-center justify-between px-5 h-16">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {getInitials(user?.email)}
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Bienvenido de nuevo</p>
            <p className="text-sm font-bold text-slate-800">{user?.email?.split('@')[0] || 'Usuario'}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-expense hover:bg-expense/10 rounded-full transition-colors"
          aria-label="Cerrar sesión"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};
