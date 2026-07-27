'use client';

import React from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import NotificationBell from './NotificationBell';
import UserProfileDropdown from './UserProfileDropdown';

export function Header({ userName, userRole }: { userName?: string; userRole?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 w-full bg-slate-900/40 backdrop-blur-xl border-b border-slate-800/80 px-8 py-3.5 flex items-center justify-between transition-colors">
      {/* Left Branding / Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Social Autopilot Engine
          </span>
        </div>
      </div>

      {/* Right Action Bar: Notification Bell, Theme Switcher & Interactive Profile Menu */}
      <div className="flex items-center gap-3">
        {/* Real-time WebSockets & BullMQ Notification Bell */}
        <NotificationBell />

        {/* Sunlight ☀️ / Moon 🌙 Toggle Switch */}
        <button
          onClick={toggleTheme}
          type="button"
          aria-label="Toggle Light and Dark Theme"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="relative group p-2 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 text-slate-200 transition-all duration-300 active:scale-95 shadow-sm cursor-pointer"
        >
          <div className="relative flex items-center justify-center w-5 h-5">
            {theme === 'dark' ? (
              <Sun className="h-4.5 w-4.5 text-amber-400 group-hover:rotate-45 transition-transform duration-300 animate-fadeIn" />
            ) : (
              <Moon className="h-4.5 w-4.5 text-indigo-600 group-hover:-rotate-12 transition-transform duration-300 animate-fadeIn" />
            )}
          </div>
        </button>

        {/* Interactive User Profile Dropdown Menu */}
        <UserProfileDropdown />
      </div>
    </header>
  );
}

export default Header;
