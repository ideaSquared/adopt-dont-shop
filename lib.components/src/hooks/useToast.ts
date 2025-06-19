import { useState, useCallback } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface UseToastReturn {
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastMessage['type'], duration?: number) => void;
  hideToast: (id: string) => void;
  clearToasts: () => void;
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastMessage['type'] = 'info', duration = 5000) => {
      const id = Math.random().toString(36).slice(2);
      const toast: ToastMessage = { id, message, type, duration };

      setToasts(prev => [...prev, toast]);
      if (duration > 0) {
        setTimeout(() => {
          hideToast(id);
        }, duration);
      }
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    showToast,
    hideToast,
    clearToasts,
  };
}
