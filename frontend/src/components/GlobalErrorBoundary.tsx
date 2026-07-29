'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';
import { toast } from './Toast';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[GlobalErrorBoundary] React component crashed:', error, errorInfo);
    toast.error(error.message || 'React rendering crashed.', 'Application Failure');
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.href = '/schedules';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 selection:bg-rose-500 selection:text-white">
          <div className="max-w-md w-full bg-slate-900/80 border border-rose-500/30 rounded-2xl p-8 backdrop-blur-xl shadow-2xl text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-5 shadow-inner">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-slate-100 mb-2">Application Crash Intercepted</h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              A runtime component error occurred. The system safely caught the exception to prevent data loss.
            </p>

            {this.state.error?.message && (
              <div className="w-full bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 mb-6 text-left overflow-x-auto">
                <code className="text-xs font-mono text-rose-300 break-all">{this.state.error.message}</code>
              </div>
            )}

            <div className="flex items-center gap-3 w-full">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/30 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                Reload App
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-all active:scale-95 border border-slate-700"
              >
                <Home className="w-4 h-4" />
                Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
