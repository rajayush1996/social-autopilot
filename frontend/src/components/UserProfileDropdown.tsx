'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  User as UserIcon, 
  Settings, 
  Sliders, 
  LogOut, 
  Sparkles, 
  Copy, 
  Check, 
  ChevronDown, 
  Users, 
  PenTool,
  ShieldCheck
} from 'lucide-react';
import ApiService from '@/services/apiService';
import { User } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

export default function UserProfileDropdown() {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const toast = useToast();

  const fetchProfile = async () => {
    try {
      const u = await ApiService.getMe();
      if (u) {
        setUser(u);
      }
    } catch (e) {
      console.warn('Could not fetch header user profile');
    }
  };

  useEffect(() => {
    fetchProfile();

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    toast.success('Logged out successfully.');
    router.push('/login');
  };

  const copyUniqueId = (e: React.MouseEvent) => {
    e.stopPropagation();
    const idToCopy = user?.uniqueId || user?.id;
    if (idToCopy) {
      navigator.clipboard.writeText(idToCopy);
      setCopied(true);
      toast.success('Unique User ID copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const roleUpper = user?.role?.toUpperCase() || 'USER';
  const isSuperAdmin = roleUpper === 'SUPER_ADMIN' || roleUpper === 'ADMIN';

  return (
    <div className="relative border-l border-[var(--border-color)] pl-3" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 rounded-2xl hover:bg-[var(--bg-input)] border border-transparent hover:border-[var(--border-color)] transition-all duration-200 cursor-pointer active:scale-95 text-left group"
      >
        <div className="w-8 h-8 rounded-full bg-[#2563EB]/15 border border-[#2563EB]/30 overflow-hidden flex items-center justify-center text-[#2563EB] font-bold text-xs shrink-0 group-hover:border-[#2563EB] transition-colors">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="h-4 w-4" />
          )}
        </div>

        <div className="hidden sm:block text-left">
          <p className="text-xs font-bold text-[var(--text-primary)] leading-tight group-hover:text-[#2563EB] transition-colors">
            {user?.name || 'Creator'}
          </p>
          <div className="flex items-center gap-1">
            <span className={`text-[9px] font-extrabold uppercase ${isSuperAdmin ? 'text-amber-500 dark:text-amber-400' : 'text-[#2563EB] dark:text-[#60A5FA]'}`}>
              {user?.role || 'USER'}
            </span>
            <ChevronDown className={`h-3 w-3 text-[var(--text-secondary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {/* Profile Dropdown Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-72 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl z-50 overflow-hidden animate-fadeIn backdrop-blur-3xl p-3 space-y-3">
          
          {/* User Header Summary Card - Inherits standard card style */}
          <div className="p-3.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2563EB]/15 border border-[#2563EB]/30 overflow-hidden flex items-center justify-center text-[#2563EB] font-bold shrink-0">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="h-5 w-5" />
                )}
              </div>

              <div className="overflow-hidden">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">{user?.name || 'Creator'}</p>
                <p className="text-[10px] text-[var(--text-secondary)] truncate">{user?.email}</p>
              </div>
            </div>

            {/* Unique Tag & AI Credits */}
            <div className="pt-2 border-t border-[var(--border-color)]/70 flex items-center justify-between text-[10px]">
              <div
                onClick={copyUniqueId}
                title="Click to copy Unique User ID"
                className="flex items-center gap-1 bg-[var(--bg-card)] hover:bg-[var(--border-color)] px-2 py-1 rounded-lg border border-[var(--border-color)] cursor-pointer transition-colors shadow-xs"
              >
                <span className="text-[var(--text-secondary)] font-bold">ID:</span>
                <span className="font-mono font-extrabold text-[#2563EB] dark:text-[#60A5FA]">{user?.uniqueId || user?.id?.substring(0, 8)}</span>
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-[var(--text-secondary)]" />}
              </div>

              <div className="flex items-center gap-1 font-bold text-[#2563EB] dark:text-[#60A5FA]">
                <Sparkles className="h-3 w-3 text-[#2563EB] animate-pulse" />
                <span>{user?.aiCredits ?? 0} Credits</span>
              </div>
            </div>
          </div>

          {/* Essential Profile Navigation */}
          <div className="space-y-1">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-colors"
            >
              <UserIcon className="h-4 w-4 text-[#2563EB]" />
              Profile & Account Settings
            </Link>

            {isSuperAdmin && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-amber-500 dark:text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-colors mt-1"
              >
                <ShieldCheck className="h-4 w-4 text-amber-500" />
                Super Admin Control
              </Link>
            )}
          </div>

          {/* Log Out */}
          <div className="pt-2 border-t border-[var(--border-color)]/70">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" /> Log Out Account
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
