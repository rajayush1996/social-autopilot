'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import ApiService from '@/services/apiService';
import { useToast } from '@/context/ToastContext';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all credentials.');
      return;
    }

    setLoading(true);

    try {
      const data = await ApiService.login({ email, password });
      if (data && data.token) {
        localStorage.setItem('auth_token', data.token);
        if (data.refreshToken) {
          localStorage.setItem('refresh_token', data.refreshToken);
        }
        toast.success('Successfully logged in!');
        router.push('/dashboard');
      } else {
        toast.error('Login failed: Invalid server token response.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      toast.error(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px] p-7 sm:p-9 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl backdrop-blur-2xl shadow-2xl space-y-6 animate-fadeIn transition-all">
      {/* Brand Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-[#0ea5e9] flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
          <Sparkles className="h-6 w-6 animate-pulse" />
        </div>
        <div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/25 text-[#2563EB] dark:text-[#60A5FA] text-[10px] font-extrabold uppercase tracking-wider mb-1.5">
            Enterprise Autopilot
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            Welcome Back
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium max-w-xs mx-auto">
            Sign in to your OmniSync dashboard to manage campaigns and autopilot schedules
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider block">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)] pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              disabled={loading}
              autoComplete="email"
              required
              className="w-full h-11 pl-10 pr-4 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-medium"
            />
          </div>
        </div>

        {/* Password Field with Eye Toggle */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider block">
              Password
            </label>
            <span className="text-[11px] text-[#2563EB] dark:text-[#60A5FA] font-semibold cursor-pointer hover:underline">
              Forgot password?
            </span>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)] pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={loading}
              autoComplete="current-password"
              required
              className="w-full h-11 pl-10 pr-11 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-medium"
            />
            {/* Eye Icon Visibility Toggle Button */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 rounded-md cursor-pointer"
              title={showPassword ? 'Hide password' : 'Show password'}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Remember Me Checkbox */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-[var(--border-color)] bg-[var(--bg-input)] text-[#2563EB] focus:ring-[#2563EB] accent-[#2563EB] cursor-pointer"
            />
            <span className="text-xs text-[var(--text-secondary)] font-medium">Remember for 30 days</span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-blue-600 hover:to-blue-700 text-white font-extrabold text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer active:scale-98 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Security Trust Badge */}
      <div className="pt-2 border-t border-[var(--border-color)]/70 flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-secondary)] font-semibold">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        <span>256-bit SSL Bank-Grade Encryption</span>
      </div>

      {/* Switch to Signup */}
      <div className="text-center">
        <p className="text-xs text-[var(--text-secondary)] font-medium">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[#2563EB] dark:text-[#60A5FA] hover:underline font-extrabold transition-all">
            Sign up for free
          </Link>
        </p>
      </div>
    </div>
  );
}
