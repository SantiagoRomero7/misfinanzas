import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6 pt-2">
        <div className="flex gap-4 p-4 bg-rose-50 rounded-2xl border border-rose-100">
          <div className="shrink-0 w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-rose-900">Atención</p>
            <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} fullWidth>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm} fullWidth isLoading={isLoading}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
