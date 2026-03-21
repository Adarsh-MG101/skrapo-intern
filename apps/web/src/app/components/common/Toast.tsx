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
      <div className="fixed top-6 right-4 sm:right-6 z-[200] space-y-4 pointer-events-none w-full max-w-[calc(100vw-32px)] sm:max-w-md flex flex-col items-end">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto w-auto min-w-[120px] max-w-[260px] sm:max-w-md px-3 py-2 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.15)] border flex items-center gap-2 sm:gap-4 animate-slide-down backdrop-blur-md
              ${toast.type === 'success' ? 'bg-emerald-500/95 text-white border-emerald-400/30' : ''}
              ${toast.type === 'error' ? 'bg-red-500/95 text-white border-red-400/30' : ''}
              ${toast.type === 'info' ? 'bg-brand-600/95 text-white border-brand-400/30' : ''}
              ${toast.persistent ? 'ring-2 ring-white/20' : ''}
            `}
          >
            <div className="flex-1 font-black text-[10px] sm:text-base uppercase tracking-wider leading-tight sm:normal-case sm:font-bold sm:tracking-normal">{toast.message}</div>
            <button 
              onClick={() => removeToast(toast.id)}
              className="w-5 h-5 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
              title="Dismiss"
            >
              <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
