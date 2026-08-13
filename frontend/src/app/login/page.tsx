'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Mail, Lock, AlertCircle } from 'lucide-react';
import ApiService from '@/services/apiService';
import { useToast } from '@/context/ToastContext';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="w-full max-w-md p-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl backdrop-blur-xl shadow-2xl space-y-6 animate-fadeIn">
      {/* Brand Header */}
      <div className="flex flex-col items-center gap-3.5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Sparkles className="h-6 w-6 animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Welcome Back
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">
            Sign in to your OmniSync social media publishing platform
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider block">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              disabled={loading}
              className="w-full h-11 pl-11 pr-4 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider block">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="w-full h-11 pl-11 pr-4 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-extrabold text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 mt-3 cursor-pointer active:scale-98 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Switch to Signup */}
      <div className="text-center pt-2">
        <p className="text-sm text-[var(--text-secondary)] font-medium">
          New to OmniSync?{' '}
          <Link href="/signup" className="text-[#2563EB] dark:text-[#60A5FA] hover:underline font-extrabold transition-all">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
