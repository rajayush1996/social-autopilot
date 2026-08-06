'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  PenTool, 
  Calendar, 
  AlarmClock,
  Sparkles, 
  User as UserIcon,
  Settings,
  Sliders,
  LogOut,
  BookOpen
} from 'lucide-react';
import ApiService from '@/services/apiService';
import CONFIG from '@/config';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState<string>('FREE');
  const [role, setRole] = useState<string>('USER');
  const [userName, setUserName] = useState<string>('Creator');

  // Fetch user profile details (credits, plan, role, name)
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await ApiService.getMe();
        if (user) {
          setCredits(user.aiCredits);
          setPlan(user.plan);
          setRole(user.role || 'USER');
          setUserName(user.name || 'Creator');
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      }
    };

    fetchProfile();
    // Setup interval to poll user credits based on CONFIG configuration
    const interval = setInterval(fetchProfile, CONFIG.POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    router.push('/login');
  };

  const navLinks = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Social Accounts', href: '/accounts', icon: Users },
    { name: 'AI Post Composer', href: '/composer', icon: PenTool },
    { name: 'Queue & History', href: '/posts', icon: Calendar },
    { name: 'OmniSync Settings', href: '/settings', icon: Settings },
    { name: 'Profile & Settings', href: '/profile', icon: UserIcon },
    ...(role.toUpperCase() === 'SUPER_ADMIN' || role.toUpperCase() === 'ADMIN' ? [{ name: 'Admin Control', href: '/admin', icon: Sliders }] : []),
  ];

  return (
    <aside className="sticky top-0 left-0 h-screen w-64 bg-[var(--bg-card)] border-r border-[var(--border-color)] text-[var(--text-primary)] flex flex-col justify-between p-4 z-40 transition-colors">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-4 mb-6">
          <div className="bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] p-2.5 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base leading-tight tracking-tight text-[var(--text-primary)]">
              {CONFIG.APP_NAME}
            </h1>
            <span className="text-[10px] text-[#0284C7] dark:text-[#38BDF8] font-bold uppercase tracking-wider block">
              {CONFIG.APP_SUBTITLE}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-[#2563EB]/15 text-[#2563EB] dark:text-[#60A5FA] font-bold border border-[#2563EB]/30 shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] font-medium'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#2563EB] rounded-r-full" />
                )}
                <Icon className={`h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? 'text-[#2563EB] dark:text-[#60A5FA]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                }`} />
                <span className="text-xs">{link.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Credit Badge */}
      <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-3.5 flex flex-col gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[#2563EB] dark:text-[#38BDF8] font-bold shadow-xs">
            <UserIcon className="h-4.5 w-4.5" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-[var(--text-primary)] truncate">{userName}</p>
            <span className="inline-block text-[9px] bg-[#2563EB]/10 text-[#2563EB] dark:text-[#38BDF8] border border-[#2563EB]/20 px-2 py-0.5 rounded-full font-extrabold uppercase">
              {plan} PLAN
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-1.5 bg-[var(--bg-card)] hover:bg-rose-500/10 text-[var(--text-secondary)] hover:text-rose-500 border border-[var(--border-color)] hover:border-rose-500/30 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log Out
        </button>

        <div className="border-t border-[var(--border-color)] pt-2.5 flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5 font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-[#2563EB] dark:text-[#38BDF8]" />
            AI Credits
          </span>
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
            credits !== null && credits <= 2 
              ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30 animate-pulse'
              : 'bg-[#2563EB]/15 text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/30'
          }`}>
            {credits !== null ? `${credits} left` : 'Loading...'}
          </span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
