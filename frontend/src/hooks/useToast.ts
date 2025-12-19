/**
 * useToast - Toast notification hook
 */

import { useState, useCallback } from 'react';

export interface Toast {
  show: boolean;
  message: string;
  type: 'success' | 'error';
}

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return { toast, showToast, hideToast };
}
