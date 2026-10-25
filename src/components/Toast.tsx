import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  onDismiss?: () => void;
}

export function Toast({ type, message, onDismiss }: ToastProps) {
  const config = {
    success: {
      icon: CheckCircle2,
      classes: 'bg-[#087F5B] text-white border border-[#155E46] shadow-lg shadow-[#087F5B]/25',
    },
    error: {
      icon: AlertCircle,
      classes: 'bg-[#E86D5A] text-white border border-[#C94B38] shadow-lg shadow-[#E86D5A]/25',
    },
    info: {
      icon: Info,
      classes: 'bg-[#20352C] text-white border border-[#304B3E] shadow-lg shadow-[#20352C]/25',
    },
  }[type];

  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ${config.classes} animate-in slide-in-from-bottom-4 duration-300`}
    >
      <Icon size={18} className="shrink-0" />
      <span className="flex-1 leading-snug">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="p-1 rounded-lg opacity-80 hover:opacity-100 cursor-pointer" aria-label="Dismiss">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

// ------- Toast container (portal-free, fixed bottom) -------

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto w-full max-w-sm">
          <Toast type={t.type} message={t.message} onDismiss={() => onDismiss(t.id)} />
        </div>
      ))}
    </div>
  );
}
