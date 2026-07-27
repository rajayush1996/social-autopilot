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
  LogOut
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
    { name: 'Autopilot Settings', href: '/settings', icon: Settings },
    { name: 'Profile & Settings', href: '/profile', icon: UserIcon },
    ...(role.toUpperCase() === 'SUPER_ADMIN' || role.toUpperCase() === 'ADMIN' ? [{ name: 'Admin Control', href: '/admin', icon: Sliders }] : []),
  ];

  return (
    <aside className="sticky top-0 left-0 h-screen w-64 bg-slate-900 border-r border-slate-800 text-slate-100 flex flex-col justify-between p-4 z-40">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-4 mb-6">
          <div className="bg-indigo-600 p-2 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="h-6 w-6 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200">
              {CONFIG.APP_NAME}
            </h1>
            <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-widest">
              {CONFIG.APP_SUBTITLE}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-900/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-100'}`} />
                <span className="text-sm font-medium">{link.name}</span>
                {isActive && (
                  <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Credit Badge */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 font-bold">
            <UserIcon className="h-5 w-5" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-200 truncate">{userName}</p>
            <span className="inline-block text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase">
              {plan} PLAN
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-2 bg-slate-900 hover:bg-rose-950/15 text-slate-405 hover:text-rose-400 border border-slate-800/80 hover:border-rose-900/30 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log Out
        </button>

        <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            AI Credits
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            credits !== null && credits <= 2 
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
          }`}>
            {credits !== null ? `${credits} left` : 'Loading...'}
          </span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
