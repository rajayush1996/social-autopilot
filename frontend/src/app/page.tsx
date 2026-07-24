'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Users, 
  CalendarCheck, 
  Clock, 
  Plus, 
  RefreshCw,
  TrendingUp,
  Brain,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ShieldAlert,
  CreditCard,
  Layers,
  Lock,
  Mail,
  User as UserIcon,
  ChevronRight,
  Play,
  Sliders,
  Sun,
  Moon
} from 'lucide-react';
import ApiService from '@/services/apiService';
import CONFIG from '@/config';
import { Post, SocialAccount, User } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import { formatDateTime } from '@/utils/date';

interface AutopilotReport {
  userId: string;
  status: 'SUCCESS' | 'SKIPPED' | 'FAILED';
  postId?: string;
  reason?: string;
}

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [isClient, setIsClient] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Dashboard states
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem('auth_token');
    if (token) {
      setIsLoggedIn(true);
      fetchDashboardData();
    } else {
      setIsLoggedIn(false);
      setLoading(false);
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [profile, linkedAccounts, postsList] = await Promise.all([
        ApiService.getMe(),
        ApiService.getConnectedAccounts(),
        ApiService.getPosts(),
      ]);

      setUser(profile);
      setAccounts(linkedAccounts);
      setPosts(postsList);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncScheduler = async () => {
    setSyncing(true);
    try {
      await ApiService.triggerSchedulerSync();
      const postsList = await ApiService.getPosts();
      setPosts(postsList);
    } catch (err) {
      console.error('Failed to sync scheduler:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Render static empty loader during hydration
  if (!isClient) {
    return <div className="min-h-screen bg-slate-955" />;
  }

  // --- PUBLIC LANDING VIEW FOR GUEST TRAFFIC ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-955 text-slate-100 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative">
        {/* Glow Accent Circles */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-650/15 via-indigo-950/5 to-transparent -z-10 blur-3xl pointer-events-none" />
        <div className="absolute top-[400px] -left-[200px] w-[500px] h-[500px] bg-purple-900/5 rounded-full -z-10 blur-3xl pointer-events-none" />
        <div className="absolute top-[800px] -right-[200px] w-[500px] h-[500px] bg-indigo-900/5 rounded-full -z-10 blur-3xl pointer-events-none" />

        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 w-full bg-slate-955/80 backdrop-blur-lg border-b border-slate-900/80">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2.5 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Sparkles className="h-5 w-5 text-white animate-pulse" />
              </div>
              <div>
                <span className="font-black text-sm tracking-wider text-white uppercase block">Social Autopilot</span>
                <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider block -mt-0.5">Autonomous posting</span>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-xs text-slate-400 hover:text-slate-200 transition-all">Features</a>
              <a href="#autopilot" className="text-xs text-slate-400 hover:text-slate-200 transition-all">AI Engine</a>
              <a href="#pricing" className="text-xs text-slate-400 hover:text-slate-200 transition-all">Pricing</a>
            </nav>

            {/* CTA Buttons & Theme Switcher */}
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                type="button"
                aria-label="Toggle Theme"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-all duration-300 active:scale-95"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5 text-amber-400" />
                ) : (
                  <Moon className="h-5 w-5 text-indigo-600" />
                )}
              </button>

              <Link href="/login" className="text-xs font-bold text-slate-300 hover:text-white px-3 py-2 transition-all">
                Sign In
              </Link>
              <Link 
                href="/signup" 
                className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-950/20 transition-all duration-300 hover:scale-105 active:scale-95"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/40 border border-indigo-850/80 text-[10px] text-indigo-400 font-bold uppercase tracking-wider shadow-inner">
            <Zap className="h-3 w-3 animate-bounce text-indigo-400" />
            Autopilot Publishing Engine v2.0
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Automate Your Social Growth{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-350 to-purple-400">
              While You Sleep
            </span>
          </h1>

          <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
            Connect your social channels. Let our rolling summary memory engine generate and publish authentic content optimized for Instagram, LinkedIn, and X. Completely customized to your brand.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link 
              href="/signup"
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-indigo-950/30 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 group"
            >
              Start Free Autopilot
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link 
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-2xl text-xs font-extrabold transition-all duration-300 active:scale-95 flex items-center justify-center gap-2"
            >
              <Play className="h-3.5 w-3.5 fill-slate-300" />
              Live Workspace Demo
            </Link>
          </div>

          {/* Interactive Floating Preview Card */}
          <div className="max-w-4xl mx-auto pt-12 md:pt-16">
            <div className="relative p-2 bg-slate-900/30 border border-slate-800/80 rounded-3xl backdrop-blur-md shadow-2xl shadow-slate-950/50 group overflow-hidden">
              <div className="bg-slate-950/80 border border-slate-850 rounded-2xl p-6 md:p-8 text-left space-y-6">
                {/* Simulated Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                      SA
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Workspace Console</span>
                      <span className="text-[9px] text-emerald-400 font-semibold uppercase tracking-wider block">Autopilot active</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                  </div>
                </div>

                {/* Simulated Post adaptation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* LinkedIn адаптер */}
                  <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4 space-y-3 hover:border-slate-700/80 transition-all duration-300">
                    <div className="flex items-center gap-2">
                      <div className="bg-[#0a66c2]/10 p-1.5 rounded-lg text-[#0a66c2]">
                        <span className="text-xs font-black">in</span>
                      </div>
                      <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">LinkedIn post</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      💡 Systemizing your workflow isn&apos;t about spending more hours—it&apos;s about building leverage. Here is how our team scales organic outreach...
                    </p>
                  </div>

                  {/* X адаптер */}
                  <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4 space-y-3 hover:border-slate-700/80 transition-all duration-300">
                    <div className="flex items-center gap-2">
                      <div className="bg-slate-800 p-1.5 rounded-lg text-slate-100">
                        <span className="text-[9px] font-black">𝕏</span>
                      </div>
                      <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">X Tweet</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Stop overthinking your content strategy. Focus on consistency, leverage AI for compaction, and schedule everything ahead. Simplicity scales. 🚀
                    </p>
                  </div>

                  {/* Instagram адаптер */}
                  <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4 space-y-3 hover:border-slate-700/80 transition-all duration-300">
                    <div className="flex items-center gap-2">
                      <div className="bg-[#e1306c]/10 p-1.5 rounded-lg text-[#e1306c]">
                        <span className="text-[10px] font-black">📷</span>
                      </div>
                      <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Instagram image</span>
                    </div>
                    <div className="h-20 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-850">
                      <span className="text-[9px] text-slate-500 font-bold">Mock Up Image Preview</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-900 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Application Architecture</h2>
            <p className="text-2xl sm:text-3xl font-black text-white">Full-Stack Autopilot Capabilities</p>
            <p className="text-xs text-slate-500">A detailed breakdown of the features and modules integrated into this system</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md hover:border-indigo-500/20 hover:translate-y-[-2px] transition-all duration-300">
              <div className="bg-indigo-550/10 p-3 rounded-xl text-indigo-400 w-fit mb-4">
                <Brain className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-200 mb-2">Rolling Memory Compactor</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Prevents repetitive posts. Our background compaction engine gathers recently published content and feeds it through GPT-4o-mini to build a rolling memory summary of topics, tone, and hooks to avoid.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md hover:border-emerald-500/20 hover:translate-y-[-2px] transition-all duration-300">
              <div className="bg-emerald-550/10 p-3 rounded-xl text-emerald-400 w-fit mb-4">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-200 mb-2">Adaptive Multi-Channel Composer</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Enter a single campaign topic and adapt it instantly for Instagram captions (rich emojis and hashtags), LinkedIn posts (mobile thought leadership structure), or concise X tweets and threads.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md hover:border-purple-500/20 hover:translate-y-[-2px] transition-all duration-300">
              <div className="bg-purple-550/10 p-3 rounded-xl text-purple-400 w-fit mb-4">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-200 mb-2">AES-256-GCM Encryption</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                SaaS-grade database security. Access tokens, refresh tokens, and rolling AI memory summaries are encrypted with native authenticated encryption algorithms using a SHA-256 derived key before write operations.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md hover:border-amber-500/20 hover:translate-y-[-2px] transition-all duration-300">
              <div className="bg-amber-550/10 p-3 rounded-xl text-amber-400 w-fit mb-4">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-200 mb-2">BullMQ & Redis Background Workers</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Asynchronous posting pipeline. Schedules and dispatches publication tasks without blocking thread execution. Implements retry logic and logs detailed platform responses directly to database logs.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md hover:border-blue-500/20 hover:translate-y-[-2px] transition-all duration-300">
              <div className="bg-blue-550/10 p-3 rounded-xl text-blue-400 w-fit mb-4">
                <Sliders className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-200 mb-2">RBAC Control Center</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Role-Based Access Control. Segregates regular users from admin dashboards. Allows administrators to define feature premium statuses, trigger on-demand autopilot generation cycles, and adjust tier quotas.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md hover:border-rose-500/20 hover:translate-y-[-2px] transition-all duration-300">
              <div className="bg-rose-550/10 p-3 rounded-xl text-rose-400 w-fit mb-4">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-200 mb-2">Media Upload Pipeline</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Fail-safe uploads. Standardizes image and video uploads to Cloudinary storage. Integrates clean local fallback simulators if credentials are offline, guaranteeing campaign submission never fails.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-900 space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Subscription Pricing</h2>
            <p className="text-2xl sm:text-3xl font-black text-white">Simple, transparent, developer-friendly tiers</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free plan */}
            <div className="bg-slate-900/30 border border-slate-850 rounded-3xl p-6 space-y-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-md text-slate-200">Starter Free</h3>
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">15 credits/month</span>
                </div>
                <span className="text-2xl font-black text-slate-200">$0</span>
              </div>
              <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
                <li>✔ Basic AI social post composer</li>
                <li>✔ Connect up to 2 social accounts</li>
                <li>✔ Manual post queuing and scheduling</li>
                <li>✖ Real-time AI Compactor checks</li>
              </ul>
              <Link 
                href="/signup"
                className="block text-center w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-bold transition-all"
              >
                Sign Up Free
              </Link>
            </div>

            {/* Premium plan */}
            <div className="bg-indigo-950/20 border-2 border-indigo-500/40 rounded-3xl p-6 space-y-5 relative overflow-hidden">
              <div className="absolute top-3 right-3 bg-indigo-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                Popular
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-md text-slate-200">Autopilot Premium</h3>
                  <span className="text-[9px] text-indigo-455 block uppercase font-bold">Unlimited credits</span>
                </div>
                <span className="text-2xl font-black text-white">$29<span className="text-xs text-slate-400">/mo</span></span>
              </div>
              <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
                <li>✔ **Autonomous Daily Autopilot Posting**</li>
                <li>✔ Connect unlimited social accounts</li>
                <li>✔ Anti-repetitive Memory Compactor Engine</li>
                <li>✔ HD media upload pipeline via Cloudinary</li>
              </ul>
              <Link 
                href="/signup"
                className="block text-center w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-900/20"
              >
                Upgrade to Premium
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-900/60 py-10 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Social Autopilot. Developed with verified modern SaaS aesthetics.</p>
        </footer>
      </div>
    );
  }

  // --- INTERNAL AUTHENTICATED CONSOLE DASHBOARD VIEW ---
  const scheduledCount = posts.filter(p => p.status === 'SCHEDULED').length;
  const publishedCount = posts.filter(p => p.status === 'PUBLISHED').length;
  const connectedAccountsCount = accounts.length;
  const isPremium = user?.plan === 'PREMIUM';

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Top Autopilot Telemetry Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-900">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">System Operational</span>
          </div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-350 tracking-tight">
            Console Overview
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Monitor and administer your autonomous content pipeline.
          </p>
        </div>

        {/* Sync Trigger and Post Create Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncScheduler}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800/80 rounded-2xl hover:bg-slate-850 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all duration-300 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sync Queue
          </button>
          
          <Link
            href="/composer"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-950/20 active:scale-95 transition-all duration-300"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Campaign
          </Link>
        </div>
      </div>

      {/* Grid: Live KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: AI Engine Credits */}
        <div className="relative group overflow-hidden bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md transition-all duration-300 hover:border-indigo-500/30 hover:translate-y-[-2px]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">AI Copilot</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:scale-110 duration-300">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-3xl font-black text-white">{user?.aiCredits ?? 0}</p>
          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-slate-850">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Tethered Subscription</span>
            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
              isPremium 
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {user?.plan ?? 'FREE'}
            </span>
          </div>
        </div>

        {/* Card 2: Channels Linked */}
        <div className="relative group overflow-hidden bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md transition-all duration-300 hover:border-emerald-500/30 hover:translate-y-[-2px]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Connected Accounts</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-110 duration-300">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-3xl font-black text-white">{connectedAccountsCount}</p>
          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-slate-850">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Active Platforms</span>
            <span className="text-[9px] text-slate-400 font-bold">Insta / Link / X</span>
          </div>
        </div>

        {/* Card 3: Pending Queue */}
        <div className="relative group overflow-hidden bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md transition-all duration-300 hover:border-amber-500/30 hover:translate-y-[-2px]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Pending Scheduler</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl group-hover:scale-110 duration-300">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-3xl font-black text-white">{scheduledCount}</p>
          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-slate-850">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Active Delayed Jobs</span>
            <span className="text-[9px] text-slate-400 font-bold">In BullMQ queue</span>
          </div>
        </div>

        {/* Card 4: Published Count */}
        <div className="relative group overflow-hidden bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md transition-all duration-300 hover:border-indigo-500/30 hover:translate-y-[-2px]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Dispatched</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:scale-110 duration-300">
              <CalendarCheck className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="text-3xl font-black text-white">{publishedCount}</p>
          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-slate-850">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Lifetime Success Rate</span>
            <span className="text-[9px] text-emerald-400 font-bold">100%</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Data Visualization & Context Memories */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Column Left (SaaS Dashboard Analytics Charts & Feeds) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* SVG Line Graph Card */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md">
            <div className="flex items-center justify-between pb-4 border-b border-slate-900 mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-200">Campaign Traffic Performance</h3>
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">Hourly telemetry overview</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-850 text-[10px] text-indigo-400 font-bold">
                <TrendingUp className="h-3.5 w-3.5" />
                +24.8%
              </div>
            </div>

            {/* Premium Hand-Drawn SVG Chart */}
            <div className="w-full h-64 relative flex items-end justify-between px-2 pt-4">
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <defs>
                  {/* Graph Area Gradient */}
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                  </linearGradient>
                  {/* Line Stroke Gradient */}
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="50%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>

                {/* Horizontal gridlines */}
                <line x1="0" y1="50" x2="100%" y2="50" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="120" x2="100%" y2="120" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="0" y1="190" x2="100%" y2="190" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />

                {/* Main filled area path */}
                <path
                  d="M 0 240 C 80 180, 120 200, 200 120 C 280 40, 320 160, 400 90 C 480 20, 520 80, 600 60 L 600 240 Z"
                  fill="url(#chartGradient)"
                  className="w-full h-full"
                  style={{ vectorEffect: 'non-scaling-stroke' }}
                />
                
                {/* Main curve stroke path */}
                <path
                  d="M 0 240 C 80 180, 120 200, 200 120 C 280 40, 320 160, 400 90 C 480 20, 520 80, 600 60"
                  fill="none"
                  stroke="url(#lineGradient)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  style={{ vectorEffect: 'non-scaling-stroke' }}
                />

                {/* Interactive telemetry dot */}
                <circle cx="400" cy="90" r="5" fill="#a78bfa" stroke="#0f172a" strokeWidth="2.5" className="animate-pulse" />
              </svg>

              {/* Chart Timeline Axis Labels */}
              <div className="absolute bottom-0 left-0 w-full flex justify-between text-[8px] text-slate-500 font-bold uppercase px-2 pt-2 border-t border-slate-900">
                <span>08:00 AM</span>
                <span>12:00 PM</span>
                <span>04:00 PM</span>
                <span>08:00 PM</span>
                <span>Midnight</span>
              </div>
            </div>
          </div>

          {/* Campaign Queue List */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-900">
              <div>
                <h3 className="text-sm font-bold text-slate-200">Active Campaign Feed</h3>
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">Scheduled & published logs</span>
              </div>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase">
                {posts.length} Posts Total
              </span>
            </div>

            {posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2.5 border border-dashed border-slate-850 rounded-2xl">
                <Clock className="h-7 w-7 text-slate-650" />
                <p className="text-xs text-slate-400 font-medium">No post campaigns queued yet.</p>
                <Link href="/composer" className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase transition-all">
                  Create a Post Campaign
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id} className="p-4 bg-slate-950/60 border border-slate-850/80 rounded-2xl flex items-center justify-between gap-4 transition-all duration-300 hover:border-slate-800">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          post.status === 'PUBLISHED' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : post.status === 'SCHEDULED'
                            ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {post.status}
                        </span>
                        <span className="text-[9px] text-slate-500 font-semibold">
                          {post.scheduledAt ? `${formatDateTime(post.scheduledAt)} UTC` : 'Instantly published'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-350 line-clamp-2 leading-relaxed">
                        {post.content}
                      </p>
                    </div>
                    {post.mediaUrls && post.mediaUrls.length > 0 && (
                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center">
                        {post.mediaType === 'VIDEO' ? (
                          <span className="text-[10px] text-indigo-400 font-bold">MP4</span>
                        ) : (
                          <img src={post.mediaUrls[0]} alt="Post thumbnail" className="w-full h-full object-cover" />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column Right (Autopilot status & memory constraints engines) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Autopilot Compact Control card */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md space-y-5">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 pb-3 border-b border-slate-900">
              <Zap className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
              Autopilot Engine Status
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-850/80">
                <div>
                  <span className="text-[9px] text-slate-500 font-semibold uppercase block">Autopilot Flag</span>
                  <span className="text-xs font-black text-slate-200">
                    {user?.autopilotEnabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <Link href="/settings" className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-850 rounded-xl text-[10px] font-bold text-slate-300 transition-all">
                  Settings
                </Link>
              </div>

              {/* Anti-Repetitive AI Compactor constraint memory display */}
              <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4.5 space-y-3.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
                  ⚙️ Compactor memory payload
                </span>
                
                {user?.contentSummary ? (
                  <div className="space-y-2.5">
                    <p className="text-[10px] text-indigo-455 font-semibold leading-relaxed">
                      Encrypted summary is stored in PostgreSQL. Decrypted payload injected into OpenAI instructions:
                    </p>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-900 text-[10px] text-slate-400 font-medium font-mono leading-normal max-h-40 overflow-y-auto">
                      {user.contentSummary}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-1.5">
                    <Brain className="h-6 w-6 text-slate-650 mx-auto" />
                    <p className="text-[9px] text-slate-500 leading-normal">
                      No memory payload compiled yet. Publish posts to feed the Rolling Compactor Engine.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Social Platforms Connected Adapter list */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-bold text-slate-200 pb-3 border-b border-slate-900">
              Adapters Status
            </h3>

            <div className="space-y-3">
              {['INSTAGRAM', 'LINKEDIN', 'X'].map((platform) => {
                const isConnected = accounts.some(a => a.platform.toUpperCase() === platform);
                return (
                  <div key={platform} className="p-3 bg-slate-955/60 border border-slate-850/80 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-350">{platform}</span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                      isConnected 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-slate-900 text-slate-550 border border-slate-850'
                    }`}>
                      {isConnected ? 'Linked' : 'Offline'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
