'use client';

import React, { useState, createContext, useContext } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  persistent: boolean;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, persistent?: boolean) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showToast = (message: string, type: ToastType = 'info', persistent = false) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type, persistent }]);

    // Only auto-dismiss non-persistent toasts
    if (!persistent) {
      setTimeout(() => {
        removeToast(id);
      }, 10000);
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-10 right-10 z-[200] space-y-3 pointer-events-none max-h-[80vh] overflow-y-auto">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto min-w-[350px] max-w-[500px] px-8 py-6 rounded-3xl shadow-2xl border flex items-start gap-4 animate-slide-up
              ${toast.type === 'success' ? 'bg-emerald-500 text-white border-emerald-600' : ''}
              ${toast.type === 'error' ? 'bg-red-500 text-white border-red-600' : ''}
              ${toast.type === 'info' ? 'bg-brand-500 text-white border-brand-600' : ''}
              ${toast.persistent ? 'ring-2 ring-white/30' : ''}
            `}
          >
            <div className="flex-1 font-black text-xl tracking-tight leading-snug">{toast.message}</div>
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-white/60 hover:text-white transition-colors flex-shrink-0 mt-1"
              title="Dismiss"
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
