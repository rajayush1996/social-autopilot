'use client';

import React, { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-4 shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Something went wrong!</h2>
        <p className="text-sm text-slate-400">
          {error?.message || 'An unexpected error occurred while loading this page.'}
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full py-2.5 px-4 bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Try Again 🔄
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 px-4 bg-[var(--bg-input)] hover:bg-[var(--border-color)] text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}
