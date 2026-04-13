import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { BottomNav } from '@/components/layout/BottomNav';

export const AuthGuard = () => {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-4 w-full overflow-x-hidden pb-safe">
      <main className="w-full">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};
