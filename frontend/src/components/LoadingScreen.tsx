'use client';

import React from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
  variant?: 'page' | 'inline' | 'card';
  size?: 'sm' | 'md' | 'lg';
}

export function ThemeSpinner({ 
  size = 'md', 
  className = '' 
}: { 
  size?: 'xs' | 'sm' | 'md' | 'lg'; 
  className?: string 
}) {
  const sizeClasses = {
    xs: 'w-3.5 h-3.5 border-2',
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2.5',
    lg: 'w-12 h-12 border-3',
  }[size];

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      {/* Outer ambient glow */}
      <div className="absolute inset-0 rounded-full bg-[var(--brand-accent)]/20 blur-sm animate-pulse" />
      {/* Spinning Dual Ring */}
      <div 
        className={`${sizeClasses} rounded-full border-[var(--brand-accent)]/25 border-t-[var(--brand-accent)] border-r-[var(--brand-cyan)] animate-spin`}
        style={{
          borderTopColor: 'var(--brand-accent)',
          borderRightColor: 'var(--brand-cyan)',
        }}
      />
    </div>
  );
}

export default function LoadingScreen({
  message = 'Loading data...',
  subMessage,
  variant = 'page',
  size = 'md',
}: LoadingScreenProps) {
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2.5 text-[var(--text-secondary)] text-xs font-medium py-2">
        <ThemeSpinner size="xs" />
        <span>{message}</span>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl gap-3 text-center">
        <ThemeSpinner size="md" />
        <p className="text-xs font-bold text-[var(--text-primary)]">{message}</p>
        {subMessage && <p className="text-[11px] text-[var(--text-secondary)]">{subMessage}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fadeIn">
      <div className="relative">
        {/* Ambient subtle glow ring behind spinner */}
        <div className="absolute -inset-2 bg-gradient-to-tr from-[#2563EB]/25 to-[#0ea5e9]/20 rounded-full blur-md animate-pulse pointer-events-none" />
        
        {/* Animated Brand Centerpiece */}
        <div className="w-14 h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-lg flex items-center justify-center relative z-10">
          <Sparkles className="w-6 h-6 text-[#2563EB] animate-pulse" />
          <div className="absolute inset-0 rounded-2xl border-2 border-[#2563EB]/40 border-t-[#2563EB] animate-spin pointer-events-none" />
        </div>
      </div>

      <div className="text-center space-y-1 max-w-sm px-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
          {message}
        </h3>
        {subMessage && (
          <p className="text-xs text-[var(--text-secondary)] font-medium">
            {subMessage}
          </p>
        )}
      </div>
    </div>
  );
}
