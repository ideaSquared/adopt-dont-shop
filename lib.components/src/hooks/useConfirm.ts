import { useState, useCallback } from 'react';

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
};

export type UseConfirmReturn = {
  isOpen: boolean;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  confirmProps: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
  };
};

export const useConfirm = (): UseConfirmReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    message: '',
  });
  const [resolver, setResolver] = useState<{
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);

    return new Promise<boolean>((resolve) => {
      setResolver({ resolve });
    });
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (resolver) {
      resolver.resolve(false);
      setResolver(null);
    }
  }, [resolver]);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (resolver) {
      resolver.resolve(true);
      setResolver(null);
    }
  }, [resolver]);

  return {
    isOpen,
    confirm,
    confirmProps: {
      isOpen,
      onClose: handleClose,
      onConfirm: handleConfirm,
      ...options,
    },
  };
};
