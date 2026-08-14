'use client';

import React from 'react';
import Link from 'next/link';
import { Sun, Moon, Sparkles, Plus, Activity } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import NotificationBell from './NotificationBell';
import UserProfileDropdown from './UserProfileDropdown';

export function Header({ userName, userRole }: { userName?: string; userRole?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full bg-[var(--bg-card)]/85 backdrop-blur-2xl border-b border-[var(--border-color)] px-6 md:px-10 py-3.5 flex items-center justify-between transition-colors shadow-xs">
      {/* Left Branding */}
      <div className="flex items-center gap-4">
        {/* Brand Logo & Title */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#0ea5e9] flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div className="hidden sm:block">
            <span className="font-extrabold text-base tracking-tight text-[var(--text-primary)] uppercase block">OmniSync</span>
            <span className="text-xs text-[var(--text-secondary)] font-medium block -mt-1">Social AI</span>
          </div>
        </Link>
      </div>

      {/* Right Action Bar */}
      <div className="flex items-center gap-3">
        {/* Quick Post Action CTA */}
        <Link
          href="/composer"
          className="h-10 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Post</span>
        </Link>

        {/* Real-time Notifications */}
        <NotificationBell />

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          type="button"
          aria-label="Toggle Light and Dark Theme"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="h-10 w-10 rounded-xl bg-[var(--bg-input)] hover:bg-[#2563EB]/10 border border-[var(--border-color)] hover:border-[#2563EB]/30 text-[var(--text-primary)] transition-all active:scale-95 shadow-xs cursor-pointer flex items-center justify-center"
        >
          {theme === 'dark' ? (
            <Sun className="h-4.5 w-4.5 text-amber-400" />
          ) : (
            <Moon className="h-4.5 w-4.5 text-[#2563EB]" />
          )}
        </button>

        {/* User Profile Avatar Dropdown */}
        <UserProfileDropdown />
      </div>
    </header>
  );
}

export default Header;
