'use client';

import React from 'react';
import { Sun, Moon, Sparkles, User as UserIcon, Bell } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

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

      {/* Right Action Bar: Theme Switcher & Profile */}
      <div className="flex items-center gap-4">
        {/* Sunlight ☀️ / Moon 🌙 Toggle Switch */}
        <button
          onClick={toggleTheme}
          type="button"
          aria-label="Toggle Light and Dark Theme"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="relative group p-2.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 text-slate-200 transition-all duration-300 active:scale-95 shadow-sm"
        >
          <div className="relative flex items-center justify-center w-5 h-5">
            {theme === 'dark' ? (
              <Sun className="h-5 w-5 text-amber-400 group-hover:rotate-45 transition-transform duration-300 animate-fadeIn" />
            ) : (
              <Moon className="h-5 w-5 text-indigo-600 group-hover:-rotate-12 transition-transform duration-300 animate-fadeIn" />
            )}
          </div>

          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-slate-800 shadow-lg">
            {theme === 'dark' ? '☀️ Switch to Light' : '🌙 Switch to Dark'}
          </span>
        </button>

        {/* User Mini Profile Badge */}
        {userName && (
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-200 leading-tight">{userName}</p>
              <span className="text-[9px] text-indigo-400 font-semibold uppercase">{userRole || 'USER'}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
