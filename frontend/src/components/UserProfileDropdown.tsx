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
    <div className="relative border-l border-slate-800/80 pl-3" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 rounded-2xl hover:bg-slate-800/60 transition-all duration-200 cursor-pointer active:scale-95 text-left group"
      >
        <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 overflow-hidden flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0 group-hover:border-indigo-400 transition-colors">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="h-4 w-4" />
          )}
        </div>

        <div className="hidden sm:block text-left">
          <p className="text-xs font-bold text-slate-200 leading-tight group-hover:text-white transition-colors">
            {user?.name || 'Creator'}
          </p>
          <div className="flex items-center gap-1">
            <span className={`text-[9px] font-extrabold uppercase ${isSuperAdmin ? 'text-amber-400' : 'text-indigo-400'}`}>
              {user?.role || 'USER'}
            </span>
            <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {/* Profile Dropdown Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-72 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden animate-fadeIn backdrop-blur-3xl p-3 space-y-3">
          
          {/* User Header Summary Card */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-850 rounded-2xl space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 overflow-hidden flex items-center justify-center text-indigo-400 font-bold shrink-0">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="h-5 w-5" />
                )}
              </div>

              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-100 truncate">{user?.name || 'Creator'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>

            {/* Unique Tag & AI Credits */}
            <div className="pt-2 border-t border-slate-850/80 flex items-center justify-between text-[10px]">
              <div
                onClick={copyUniqueId}
                title="Click to copy Unique User ID"
                className="flex items-center gap-1 bg-slate-900 hover:bg-slate-850 px-2 py-1 rounded-lg border border-slate-800 cursor-pointer transition-colors"
              >
                <span className="text-slate-500 font-bold">ID:</span>
                <span className="font-mono font-extrabold text-indigo-300">{user?.uniqueId || user?.id?.substring(0, 8)}</span>
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-slate-400" />}
              </div>

              <div className="flex items-center gap-1 font-bold text-indigo-300">
                <Sparkles className="h-3 w-3 text-indigo-400" />
                <span>{user?.aiCredits ?? 0} Credits</span>
              </div>
            </div>
          </div>

          {/* Essential Profile Navigation */}
          <div className="space-y-1">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-850 transition-colors"
            >
              <UserIcon className="h-4 w-4 text-indigo-400" />
              Profile & Account Settings
            </Link>

            {isSuperAdmin && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-amber-300 hover:bg-amber-500/10 border border-amber-500/20 transition-colors mt-1"
              >
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                Super Admin Control
              </Link>
            )}
          </div>

          {/* Log Out */}
          <div className="pt-2 border-t border-slate-850">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" /> Log Out Account
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
