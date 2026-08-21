'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Mail, Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, CheckCircle2, ArrowLeft, BookOpen } from 'lucide-react';
import ApiService from '@/services/apiService';
import { useToast } from '@/context/ToastContext';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const toast = useToast();

  // Simple visual password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-transparent' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2 || score === 3) return { score: 2, label: 'Good', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error('Please fill in all registration details.');
      return;
    }

    if (!acceptedTerms) {
      toast.error('Please accept the Privacy Policy & Terms to create an account.');
      return;
    }

    setLoading(true);

    try {
      await ApiService.register({ name, email, password });
      setRegistered(true);
      toast.success('Registration successful! Please check your email.');
    } catch (err: any) {
      console.error('Registration error:', err);
      toast.error(err.response?.data?.message || 'An error occurred during sign up.');
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="w-full max-w-[440px] space-y-4 animate-fadeIn transition-all">
        {/* Top Navigation Bar: Back to Home & Docs */}
        <div className="flex items-center justify-between px-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors py-1.5 px-3 rounded-xl hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-color)] group"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center gap-1 text-xs font-bold text-[var(--text-secondary)] hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors py-1.5 px-3 rounded-xl hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-color)]"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Docs</span>
          </Link>
        </div>

        <div className="w-full p-7 sm:p-9 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl backdrop-blur-2xl shadow-2xl space-y-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500 shadow-md">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
              Verify Your Email
            </h1>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto font-medium">
              We sent a verification link to <span className="text-[var(--text-primary)] font-bold">{email}</span>. Please click the link in your inbox to activate your account.
            </p>
            <div className="p-3.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl text-[11px] text-[var(--text-secondary)] text-left leading-relaxed w-full">
              💡 <strong className="text-[var(--text-primary)]">Sandbox Mode:</strong> The verification URL is also logged directly in the backend terminal console for quick testing.
            </div>
            <Link 
              href="/login" 
              className="w-full py-3 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 mt-2"
            >
              <span>Proceed to Sign In</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[440px] space-y-4 animate-fadeIn transition-all">
      {/* Top Navigation Bar: Back to Home & Docs */}
      <div className="flex items-center justify-between px-1">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors py-1.5 px-3 rounded-xl hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-color)] group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </Link>
        <Link
          href="/docs"
          className="inline-flex items-center gap-1 text-xs font-bold text-[var(--text-secondary)] hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition-colors py-1.5 px-3 rounded-xl hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-color)]"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Docs</span>
        </Link>
      </div>

      <div className="w-full p-7 sm:p-9 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl backdrop-blur-2xl shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <Link href="/" className="group" title="Go to Home">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-[#0ea5e9] flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
          </Link>
          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/25 text-[#2563EB] dark:text-[#60A5FA] text-[10px] font-extrabold uppercase tracking-wider mb-1.5">
              Start Free
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
              Create Your Account
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium max-w-xs mx-auto">
              Get started with autonomous multi-channel AI content scheduling
            </p>
          </div>
        </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Field */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider block">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)] pointer-events-none" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ayush Raj"
              disabled={loading}
              autoComplete="name"
              required
              className="w-full h-11 pl-10 pr-4 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-medium"
            />
          </div>
        </div>

        {/* Email Field */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider block">
            Work Email Address
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
          <label className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider block">
            Create Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)] pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              disabled={loading}
              autoComplete="new-password"
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

          {/* Password Strength Meter */}
          {password && (
            <div className="pt-1 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-[var(--text-secondary)]">Password Strength:</span>
                <span className={strength.score === 3 ? 'text-emerald-500' : strength.score === 2 ? 'text-amber-500' : 'text-rose-500'}>
                  {strength.label}
                </span>
              </div>
              <div className="h-1 w-full bg-[var(--border-color)] rounded-full overflow-hidden flex gap-1">
                <div className={`h-full flex-1 rounded-full transition-all ${strength.score >= 1 ? strength.color : 'bg-transparent'}`} />
                <div className={`h-full flex-1 rounded-full transition-all ${strength.score >= 2 ? strength.color : 'bg-transparent'}`} />
                <div className={`h-full flex-1 rounded-full transition-all ${strength.score >= 3 ? strength.color : 'bg-transparent'}`} />
              </div>
            </div>
          )}
        </div>

        {/* Privacy Policy Agreement Checkbox */}
        <div className="flex items-start gap-2.5 pt-1.5 pb-1">
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
              Privacy Policy & Terms of Service
            </Link>
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
              <span>Create Account</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Security Trust Badge */}
      <div className="pt-2 border-t border-[var(--border-color)]/70 flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-secondary)] font-semibold">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        <span>Free Tier Included • No Credit Card Required</span>
      </div>

      {/* Switch to Login */}
      <div className="text-center">
        <p className="text-xs text-[var(--text-secondary)] font-medium">
          Already have an account?{' '}
          <Link href="/login" className="text-[#2563EB] dark:text-[#60A5FA] hover:underline font-extrabold transition-all">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  </div>
);
}
