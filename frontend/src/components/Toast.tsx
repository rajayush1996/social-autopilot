'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export const toast = {
  emit(type: ToastType, message: string, title?: string, duration = 4000) {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('app_toast_dispatch', {
        detail: { id: Math.random().toString(36).substring(2, 9), type, message, title, duration },
      });
      window.dispatchEvent(event);
    }
  },
  success(message: string, title = 'Success') {
    this.emit('success', message, title);
  },
  error(message: string, title = 'Application Error') {
    this.emit('error', message, title, 6000);
  },
  warning(message: string, title = 'Warning') {
    this.emit('warning', message, title);
  },
  info(message: string, title = 'Notice') {
    this.emit('info', message, title);
  },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastMessage>;
      const newToast = customEvent.detail;
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, newToast.duration || 4000);
    };

    window.addEventListener('app_toast_dispatch', handleToastEvent);
    return () => window.removeEventListener('app_toast_dispatch', handleToastEvent);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-3 max-w-md w-full pointer-events-none px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-2xl backdrop-blur-xl border transition-all duration-300 animate-in slide-in-from-top-5 fade-in ${
            t.type === 'error'
              ? 'bg-rose-950/85 border-rose-500/50 text-rose-100 shadow-rose-950/60'
              : t.type === 'success'
              ? 'bg-emerald-950/85 border-emerald-500/50 text-emerald-100 shadow-emerald-950/60'
              : t.type === 'warning'
              ? 'bg-amber-950/85 border-amber-500/50 text-amber-100 shadow-amber-950/60'
              : 'bg-indigo-950/85 border-indigo-500/50 text-indigo-100 shadow-indigo-950/60'
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-indigo-400" />}
          </div>

          <div className="flex-1 min-w-0">
            {t.title && <h4 className="font-semibold text-sm leading-tight">{t.title}</h4>}
            <p className="text-xs opacity-90 leading-normal mt-0.5 break-words">{t.message}</p>
          </div>

          <button
            onClick={() => removeToast(t.id)}
            className="shrink-0 p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
