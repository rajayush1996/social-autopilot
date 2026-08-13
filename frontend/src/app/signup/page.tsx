'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Mail, Lock, User, AlertCircle } from 'lucide-react';
import ApiService from '@/services/apiService';
import { useToast } from '@/context/ToastContext';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error('Please fill in all registration details.');
      return;
    }

    if (!acceptedTerms) {
      toast.error('Please accept the Privacy Policy to create an account.');
      return;
    }

    setLoading(true);

    try {
      await ApiService.register({ name, email, password });
      setRegistered(true);
      toast.success('Registration successful! Please verify your email.');
    } catch (err: any) {
      console.error('Registration error:', err);
      toast.error(err.response?.data?.message || 'An error occurred during sign up.');
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="w-full max-w-md p-8 bg-slate-900/40 border border-slate-800/80 rounded-3xl backdrop-blur-lg shadow-2xl space-y-6 text-center animate-fadeIn">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-indigo-650/10 p-3 rounded-2xl border border-indigo-500/20 flex items-center justify-center shadow-lg">
            <Mail className="h-8 w-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-350">
            Verify Your Email
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed mt-2 animate-pulse">
            A verification link has been sent to your email address.
          </p>
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-[10px] text-slate-500 text-left leading-relaxed">
            💡 **Developer Sandbox Tip:** Check the backend console logs. The verification link is logged there for direct clicking!
          </div>
          <Link href="/login" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg mt-4">
            Proceed to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl backdrop-blur-xl shadow-2xl space-y-6 animate-fadeIn">
      {/* Brand Header */}
      <div className="flex flex-col items-center gap-3.5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Sparkles className="h-6 w-6 animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Create Account
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">
            Register and schedule your brand posts autonomously with OmniSync
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider block">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Elon Musk"
              disabled={loading}
              className="w-full h-11 pl-11 pr-4 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>
        </div>

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

        {/* Privacy Policy Agreement Checkbox */}
        <div className="flex items-start gap-2.5 pt-1 pb-1">
          <input
            type="checkbox"
            id="terms"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            disabled={loading}
            className="mt-0.5 rounded border-[var(--border-color)] bg-[var(--bg-input)] text-[#2563EB] focus:ring-[#2563EB] accent-[#2563EB] cursor-pointer"
          />
          <label htmlFor="terms" className="text-xs text-[var(--text-secondary)] leading-snug cursor-pointer select-none font-medium">
            I agree to the{' '}
            <Link href="/privacy" target="_blank" className="text-[#2563EB] dark:text-[#60A5FA] hover:underline font-extrabold">
              Privacy Policy & Terms
            </Link>
          </label>
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
            'Create Account'
          )}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="text-center pt-2">
        <p className="text-sm text-[var(--text-secondary)] font-medium">
          Already have an account?{' '}
          <Link href="/login" className="text-[#2563EB] dark:text-[#60A5FA] hover:underline font-extrabold transition-all">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
