import { useToastStore } from '@/store/useToastStore';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';
import { useEffect, useState } from 'react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-[90%] sm:max-w-md px-4">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, onRemove }: { toast: any; onRemove: () => void }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const icons = {
    success: <CheckCircle2 size={18} className="text-emerald-500" />,
    error: <AlertCircle size={18} className="text-rose-500" />,
    info: <Info size={18} className="text-blue-500" />,
  };

  const bgColors = {
    success: 'bg-emerald-50 border-emerald-100',
    error: 'bg-rose-50 border-rose-100',
    info: 'bg-blue-50 border-blue-100',
  };

  return (
    <div
      className={`
        flex items-center gap-3 p-3.5 rounded-2xl border shadow-lg shadow-slate-200/50 backdrop-blur-sm
        transition-all duration-300 transform
        ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}
        ${bgColors[toast.type as keyof typeof bgColors]}
      `}
    >
      <div className="shrink-0">{icons[toast.type as keyof typeof icons]}</div>
      <p className="text-sm font-semibold text-slate-800 flex-1">{toast.message}</p>
      <button onClick={onRemove} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
        <X size={16} />
      </button>
    </div>
  );
};
