'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { ToastProvider } from '../context/ToastContext';
import { ThemeProvider } from '../context/ThemeContext';
import ApiService from '@/services/apiService';
import { User } from '@/lib/api';
import { Sparkles } from 'lucide-react';

function MinimalSaaSPageLoader({ message = 'Loading workspace...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-app)] transition-colors duration-200">
      {/* Top Thin Blue Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-[var(--bg-input)] overflow-hidden">
        <div className="h-full bg-[#2563EB] w-1/3 animate-pulse" />
      </div>

      {/* Clean SaaS Loader Badge */}
      <div className="flex flex-col items-center text-center space-y-3.5 max-w-xs mx-auto p-6">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center text-[#2563EB]">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Clean Typography */}
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
            Social AutoPilot
          </h2>
          <p className="text-xs text-[var(--text-secondary)] font-medium">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setMounted(true);
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    setHasToken(!!token);
    
    const isAuthRoute = pathname === '/login' || pathname === '/signup';
    const isPublicHome = pathname === '/';

    if (!token) {
      if (!isAuthRoute && !isPublicHome) {
        router.push('/login');
      }
    } else {
      if (isAuthRoute) {
        router.push('/');
      } else {
        ApiService.getMe()
          .then(u => setUser(u))
          .catch(() => {});
      }
    }
  }, [pathname, router]);

  const isAuthPage = pathname === '/login' || pathname === '/signup';

  if (!mounted) {
    return (
      <ThemeProvider>
        <ToastProvider>
          <MinimalSaaSPageLoader message="Loading workspace..." />
        </ToastProvider>
      </ThemeProvider>
    );
  }

  const showSidebar = hasToken && !isAuthPage;

  if (!showSidebar) {
    return (
      <ThemeProvider>
        <ToastProvider>
          <div 
            className={`min-h-screen text-[var(--text-primary)] font-sans relative overflow-hidden transition-colors bg-[var(--bg-app)] ${
              isAuthPage 
                ? 'flex items-center justify-center' 
                : ''
            }`}
            suppressHydrationWarning
          >
            {isAuthPage && (
              <>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none animate-pulse" />
                <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
              </>
            )}
            {children}
          </div>
        </ToastProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="min-h-full flex bg-[var(--bg-app)] text-[var(--text-primary)] overflow-hidden font-sans w-screen h-screen" suppressHydrationWarning>
          <Sidebar />
          <div className="flex-1 h-screen flex flex-col overflow-hidden bg-[var(--bg-app)]">
            {/* Top Navigation Header with Sunlight/Moon theme switcher */}
            <Header userName={user?.name || 'Creator'} userRole={user?.role} />
            
            <main className="flex-1 overflow-y-auto" suppressHydrationWarning>
              <div className="min-h-full py-8 px-8 max-w-7xl mx-auto" suppressHydrationWarning>
                {children}
              </div>
            </main>
          </div>
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
