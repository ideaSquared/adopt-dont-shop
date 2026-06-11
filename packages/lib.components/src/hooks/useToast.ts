import { useState, useCallback, useEffect, useRef } from 'react';

export type ToastMessage = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
};

export type UseToastReturn = {
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastMessage['type'], duration?: number) => void;
  hideToast: (id: string) => void;
  clearToasts: () => void;
};

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timerIds = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Clear all pending timers on unmount to avoid setState calls on
  // an unmounted component and memory leaks in long-lived SPAs.
  useEffect(() => {
    return () => {
      timerIds.current.forEach(id => clearTimeout(id));
      timerIds.current.clear();
    };
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastMessage['type'] = 'info', duration = 5000) => {
      const id = Math.random().toString(36).slice(2);
      const toast: ToastMessage = { id, message, type, duration };

      setToasts(prev => [...prev, toast]);
      if (duration > 0) {
        const timerId = setTimeout(() => {
          timerIds.current.delete(timerId);
          hideToast(id);
        }, duration);
        timerIds.current.add(timerId);
      }
    },
    [hideToast]
  );

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
