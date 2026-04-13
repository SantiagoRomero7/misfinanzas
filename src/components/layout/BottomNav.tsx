import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ArrowLeftRight, PieChart, Target, FileText, User } from 'lucide-react';

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: '/', icon: Home, label: 'Inicio' },
    { path: '/transactions', icon: ArrowLeftRight, label: 'Transacciones' },
    { path: '/budget', icon: PieChart, label: 'Limites' },
    { path: '/savings', icon: Target, label: 'Ahorros' },
    { path: '/reports', icon: FileText, label: 'Reportes' },
    { path: '/profile', icon: User, label: 'Perfil' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 pb-safe">
      <div className="flex items-center justify-between px-2 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path || (tab.path !== '/' && location.pathname.startsWith(tab.path));
          
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors
                ${isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}
              `}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
