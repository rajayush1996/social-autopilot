'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { ToastProvider } from '../context/ToastContext';
import { ThemeProvider } from '../context/ThemeContext';
import ApiService from '@/services/apiService';
import { User } from '@/lib/api';

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
  const showSidebar = mounted && hasToken && !isAuthPage;

  if (!showSidebar) {
    return (
      <ThemeProvider>
        <ToastProvider>
          <div 
            className={`min-h-screen text-slate-100 font-sans relative overflow-hidden transition-colors ${
              isAuthPage 
                ? 'flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/20 via-slate-955 to-slate-955' 
                : 'bg-slate-955'
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
        <div className="min-h-full flex bg-slate-955 text-slate-100 overflow-hidden font-sans w-screen h-screen" suppressHydrationWarning>
          <Sidebar />
          <div className="flex-1 h-screen flex flex-col overflow-hidden bg-slate-950">
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
