import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Profile = () => {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="space-y-6 pb-24 px-4 w-full overflow-x-hidden flex flex-col items-center pt-8">
      <div className="w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center text-3xl font-bold shadow-lg shadow-primary/30 mb-2">
        {user.email?.charAt(0).toUpperCase() || <User size={40} />}
      </div>
      
      <div className="text-center w-full mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Mi Perfil</h2>
        <p className="text-slate-500">{user.email}</p>
      </div>

      <div className="w-full max-w-sm mt-8">
        <Button variant="danger" fullWidth onClick={handleLogout}>
          <LogOut size={18} className="mr-2" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
};
