'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  PenTool, 
  Calendar, 
  Sparkles, 
  User as UserIcon,
  Settings,
  Sliders,
  LogOut,
  Zap,
  MoreVertical,
  CreditCard
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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    const interval = setInterval(fetchProfile, CONFIG.POLLING_INTERVAL_MS);

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    router.push('/login');
  };

  const mainNav = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Composer', href: '/composer', icon: PenTool },
    { name: 'Schedule', href: '/posts', icon: Calendar },
  ];

  const managementNav = [
    { name: 'Channels', href: '/accounts', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
    { name: 'Billing & Plan', href: '/profile', icon: UserIcon },
  ];

  const adminNav = role.toUpperCase() === 'SUPER_ADMIN' || role.toUpperCase() === 'ADMIN' 
    ? [{ name: 'Admin', href: '/admin', icon: Sliders }] 
    : [];

  return (
    <aside className="sticky top-0 left-0 h-screen w-64 bg-[var(--bg-card)] border-r border-[var(--border-color)] text-[var(--text-primary)] flex flex-col justify-between p-5 z-40 transition-all shrink-0">
      <div className="space-y-6">
        {/* Simplified Brand Header - Logo + Brand Name Only */}
        <Link href="/" className="flex items-center gap-3 px-2 py-1 group">
          <div className="bg-[#2563EB] p-2.5 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 text-white transition-transform group-hover:scale-105">
            <Zap className="h-5 w-5 fill-white" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-[var(--text-primary)] uppercase">
            {CONFIG.APP_NAME}
          </span>
        </Link>

        {/* Section 1: Main Workspace */}
        <div className="space-y-2">
          <span className="text-[11px] font-extrabold text-[var(--text-secondary)]/70 uppercase tracking-wider px-3 block">
            Publishing
          </span>
          <nav className="space-y-1">
            {mainNav.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group relative text-sm ${
                    isActive
                      ? 'font-extrabold bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/20 shadow-xs'
                      : 'font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)]'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#2563EB] rounded-r-full" />
                  )}
                  <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                    isActive ? 'text-[#2563EB] dark:text-[#60A5FA]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                  }`} />
                  <span className="tracking-tight">{link.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Section 2: Management & Accounts */}
        <div className="space-y-2">
          <span className="text-[11px] font-extrabold text-[var(--text-secondary)]/70 uppercase tracking-wider px-3 block">
            Management
          </span>
          <nav className="space-y-1">
            {managementNav.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group relative text-sm ${
                    isActive
                      ? 'font-extrabold bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/20 shadow-xs'
                      : 'font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)]'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#2563EB] rounded-r-full" />
                  )}
                  <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                    isActive ? 'text-[#2563EB] dark:text-[#60A5FA]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                  }`} />
                  <span className="tracking-tight">{link.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Section 3: Admin Controls (If Admin) */}
        {adminNav.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] font-extrabold text-[var(--text-secondary)]/70 uppercase tracking-wider px-3 block">
              System
            </span>
            <nav className="space-y-1">
              {adminNav.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group relative text-sm ${
                      isActive
                        ? 'font-extrabold bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/20 shadow-xs'
                        : 'font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)]'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#2563EB] rounded-r-full" />
                    )}
                    <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                      isActive ? 'text-[#2563EB] dark:text-[#60A5FA]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                    }`} />
                    <span className="tracking-tight">{link.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Sleek Compact Footer Profile Card with Dropdown Menu */}
      <div className="relative" ref={menuRef}>
        <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[#2563EB] font-bold shadow-xs shrink-0">
              <UserIcon className="h-4.5 w-4.5" />
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-extrabold text-[var(--text-primary)] truncate leading-tight">{userName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/20 px-1.5 py-0.2 rounded font-extrabold uppercase">
                  {role.toUpperCase() === 'SUPER_ADMIN' || role.toUpperCase() === 'ADMIN' ? role.replace('_', ' ') : `${plan}`}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] font-semibold">
                  • {role.toUpperCase() === 'SUPER_ADMIN' || role.toUpperCase() === 'ADMIN' ? '∞' : (credits !== null ? `${credits}cr` : '...')}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="h-8 w-8 rounded-xl bg-[var(--bg-card)] hover:bg-[#2563EB]/10 border border-[var(--border-color)] hover:border-[#2563EB]/30 text-[var(--text-secondary)] hover:text-[#2563EB] flex items-center justify-center transition-all cursor-pointer shrink-0"
            title="User options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>

        {/* Profile Popover Menu */}
        {showProfileMenu && (
          <div className="absolute bottom-16 right-0 w-52 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-1.5 z-50 animate-fadeIn backdrop-blur-xl space-y-1">
            <Link
              href="/profile"
              onClick={() => setShowProfileMenu(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-extrabold text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-all"
            >
              <CreditCard className="h-4 w-4 text-[#2563EB]" />
              <span>Billing & Plan</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setShowProfileMenu(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-extrabold text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer text-left"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
