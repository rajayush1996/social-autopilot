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
        router.push('/');
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
    <div className="w-full max-w-md p-8 bg-slate-900/40 border border-slate-800/80 rounded-3xl backdrop-blur-lg shadow-2xl space-y-6 animate-fadeIn">
      {/* Brand Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="bg-indigo-650/10 p-3 rounded-2xl border border-indigo-500/20 flex items-center justify-center shadow-lg">
          <Sparkles className="h-8 w-8 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-350">
            Welcome Back
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Access your OmniSync social media publishing platform
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              disabled={loading}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-650 focus:outline-none focus:border-indigo-650 transition-all"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-650 focus:outline-none focus:border-indigo-650 transition-all"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-900/20 active:scale-98 flex items-center justify-center gap-2 mt-2"
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
        <p className="text-xs text-slate-500">
          New to Social Autopilot?{' '}
          <Link href="/signup" className="text-indigo-400 hover:text-indigo-350 font-semibold transition-all">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
