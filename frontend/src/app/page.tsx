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
  Moon,
  Globe
} from 'lucide-react';
import ApiService from '@/services/apiService';
import CONFIG from '@/config';
import { Post, SocialAccount, User } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';
import { formatDateTime } from '@/utils/date';
import DashboardWidgets from '@/components/DashboardWidgets';
import UserProfileDropdown from '@/components/UserProfileDropdown';
import BrandLogo from '@/components/BrandLogo';

interface AutopilotReport {
  userId: string;
  status: 'SUCCESS' | 'SKIPPED' | 'FAILED';
  postId?: string;
  reason?: string;
}

// Crisp Brand SVG Icons
function LinkedInBrandIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...props}>
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
    </svg>
  );
}

function XBrandIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function InstagramBrandIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
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
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      // Safely verify token with getMe() without breaking the landing page
      ApiService.getMe()
        .then((profile) => {
          setIsLoggedIn(true);
          setUser(profile);
          // Load linked accounts and posts in background
          Promise.all([
            ApiService.getConnectedAccounts().catch(() => []),
            ApiService.getPosts().catch(() => []),
          ]).then(([linkedAccounts, postsList]) => {
            setAccounts(linkedAccounts);
            setPosts(postsList);
          });
        })
        .catch(() => {
          // Token is dead or expired -> clear stale credentials and treat as guest visitor on Landing Page
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          setIsLoggedIn(false);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setIsLoggedIn(false);
      setLoading(false);
    }
  }, []);

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
    return <div className="min-h-screen bg-[var(--bg-app)]" />;
  }

  // --- CLEAN PUBLIC & LOGGED-IN LANDING PAGE ---
  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] font-sans selection:bg-indigo-500/30 overflow-x-hidden relative">
        {/* Glow Accent Circles */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-650/15 via-indigo-950/5 to-transparent -z-10 blur-3xl pointer-events-none" />
        <div className="absolute top-[400px] -left-[200px] w-[500px] h-[500px] bg-purple-900/5 rounded-full -z-10 blur-3xl pointer-events-none" />
        <div className="absolute top-[800px] -right-[200px] w-[500px] h-[500px] bg-indigo-900/5 rounded-full -z-10 blur-3xl pointer-events-none" />

        {/* Top Navbar */}
        {/* High-End Glassmorphism Navbar */}
        <header className="border-b border-[var(--border-color)] bg-[var(--bg-card)]/85 backdrop-blur-2xl sticky top-0 z-50 transition-colors py-1">
          <div className="max-w-7xl mx-auto px-6 md:px-8 py-3.5 flex items-center justify-between">
            {/* Logo Badge & Title */}
            <BrandLogo href="/" size="md" showVersionBadge={true} subtitleText="Autonomous Social AI" />

            {/* Pill Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 bg-[var(--bg-input)] p-1.5 rounded-2xl border border-[var(--border-color)]">
              <a href="#features" className="px-4 py-2 rounded-xl text-xs font-extrabold text-[var(--text-secondary)] hover:text-[#2563EB] hover:bg-[#2563EB]/10 border border-transparent hover:border-[#2563EB]/20 transition-all duration-200">Architecture</a>
              <a href="#autopilot" className="px-4 py-2 rounded-xl text-xs font-extrabold text-[var(--text-secondary)] hover:text-[#2563EB] hover:bg-[#2563EB]/10 border border-transparent hover:border-[#2563EB]/20 transition-all duration-200">AI Compactor</a>
              <a href="#pricing" className="px-4 py-2 rounded-xl text-xs font-extrabold text-[var(--text-secondary)] hover:text-[#2563EB] hover:bg-[#2563EB]/10 border border-transparent hover:border-[#2563EB]/20 transition-all duration-200">Pricing Tiers</a>
            </nav>

            {/* Action Bar & Theme Switcher */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                type="button"
                aria-label="Toggle Theme"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                className="h-10 px-3.5 rounded-xl bg-[var(--bg-input)] hover:bg-[#2563EB]/10 border border-[var(--border-color)] hover:border-[#2563EB]/30 text-[var(--text-primary)] transition-all text-xs font-extrabold shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-bold">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 text-[#2563EB]" />
                    <span className="text-xs font-bold">Dark</span>
                  </>
                )}
              </button>

              {isLoggedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    className="h-10 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                  >
                    <Zap className="h-4 w-4" />
                    <span>Go to Dashboard</span>
                  </Link>

                  {/* High-End User Profile Avatar Dropdown Menu */}
                  <UserProfileDropdown />
                </>
              ) : (
                <>
                  <Link href="/login" className="h-10 px-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] hover:bg-[#2563EB]/10 hover:border-[#2563EB]/30 text-[var(--text-primary)] hover:text-[#2563EB] text-xs font-extrabold flex items-center justify-center transition-all shadow-xs">
                    Sign In
                  </Link>

                  <Link 
                    href="/signup" 
                    className="h-10 px-5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Get Started</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#2563EB] text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            OmniSync Publishing Engine v2.0
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] max-w-4xl mx-auto text-[var(--text-primary)]">
            Automate Your Social Media <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] via-sky-500 to-emerald-500">
              Across Instagram, LinkedIn & X
            </span>
          </h1>

          <p className="text-[var(--text-secondary)] text-sm md:text-base leading-relaxed max-w-2xl mx-auto font-medium">
            Connect your social accounts, set your brand niche, and let OpenAI automatically generate, format, schedule, and publish high-converting organic posts on Redis queues.
          </p>

          {/* Multi-Channel Network Badges Strip (Drital Hub Style in Electric Blue) */}
          <div className="pt-6 pb-2">
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#2563EB] mb-4">
              Seamlessly Connect & Schedule Across All Networks
            </p>
            <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
              {[
                { name: 'Facebook', color: 'text-blue-600', bg: 'bg-blue-500/10 border-blue-500/30' },
                { name: 'Instagram', color: 'text-pink-500', bg: 'bg-pink-500/10 border-pink-500/30' },
                { name: 'X (Twitter)', color: 'text-[var(--text-primary)]', bg: 'bg-[var(--bg-input)] border-[var(--border-color)]' },
                { name: 'LinkedIn', color: 'text-[#0a66c2]', bg: 'bg-[#0a66c2]/10 border-[#0a66c2]/30' },
                { name: 'YouTube', color: 'text-rose-600', bg: 'bg-rose-500/10 border-rose-500/30' },
                { name: 'Threads', color: 'text-[var(--text-primary)]', bg: 'bg-[var(--bg-input)] border-[var(--border-color)]' },
                { name: 'Pinterest', color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/30' },
                { name: 'Reddit', color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/30' },
                { name: 'Bluesky', color: 'text-sky-500', bg: 'bg-sky-500/10 border-sky-500/30' },
                { name: 'Mastodon', color: 'text-indigo-500', bg: 'bg-indigo-500/10 border-indigo-500/30' },
              ].map((channel, cIdx) => (
                <div
                  key={cIdx}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border ${channel.bg} transition-all duration-300 hover:scale-105 shadow-xs cursor-pointer group`}
                >
                  <span className={`text-xs font-black ${channel.color}`}>
                    {channel.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link 
              href={isLoggedIn ? "/composer" : "/signup"}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-blue-500/30 transition-all flex items-center gap-2 group cursor-pointer"
            >
              <span>{isLoggedIn ? "Launch AI Composer Studio" : "Start Free OmniSync"}</span>
              <ArrowRight className="h-4.5 w-4.5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href={isLoggedIn ? "/profile" : "/login"}
              className="px-8 py-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-input)] hover:border-[#2563EB] text-[var(--text-primary)] font-bold text-sm transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Play className="h-4 w-4 fill-[#2563EB] text-[#2563EB]" />
              <span>{isLoggedIn ? "Account Profile" : "Live Workspace Demo"}</span>
            </Link>
          </div>

          {/* Interactive Floating Preview Card */}
          <div className="max-w-6xl mx-auto pt-12 md:pt-16">
            <div className="relative p-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl backdrop-blur-md shadow-2xl group overflow-hidden">
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 md:p-8 text-left space-y-6">
                {/* Simulated Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-blue-500/20">
                      SA
                    </div>
                    <div>
                      <span className="text-sm font-extrabold text-[var(--text-primary)] block">Workspace Console</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider block">Autopilot Active</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500/40" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/40" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/40" />
                  </div>
                </div>

                {/* Simulated Post adaptation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* LinkedIn адаптер */}
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-3 hover:border-slate-700/80 transition-all duration-300 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-[#0a66c2]/10 p-2 rounded-xl text-[#0a66c2]">
                        <LinkedInBrandIcon className="w-4 h-4 text-[#0a66c2]" />
                      </div>
                      <span className="text-xs text-[var(--text-primary)] font-extrabold uppercase tracking-wider">LinkedIn post</span>
                    </div>
                    <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed font-medium">
                      💡 Systemizing your workflow isn&apos;t about spending more hours—it&apos;s about building leverage. Here is how our team scales organic outreach...
                    </p>
                  </div>

                  {/* X адаптер */}
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-3 hover:border-slate-700/80 transition-all duration-300 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-[var(--bg-input)] p-2 rounded-xl text-[var(--text-primary)] border border-[var(--border-color)]">
                        <XBrandIcon className="w-4 h-4 text-[var(--text-primary)]" />
                      </div>
                      <span className="text-xs text-[var(--text-primary)] font-extrabold uppercase tracking-wider">X Tweet</span>
                    </div>
                    <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed font-medium">
                      Stop overthinking your content strategy. Focus on consistency, leverage AI for compaction, and schedule everything ahead. Simplicity scales. 🚀
                    </p>
                  </div>

                  {/* Instagram адаптер */}
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 space-y-3 hover:border-slate-700/80 transition-all duration-300 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-[#e1306c]/10 p-2 rounded-xl text-[#e1306c]">
                        <InstagramBrandIcon className="w-4 h-4 text-[#e1306c]" />
                      </div>
                      <span className="text-xs text-[var(--text-primary)] font-extrabold uppercase tracking-wider">Instagram image</span>
                    </div>
                    <div className="h-24 bg-[var(--bg-input)] rounded-xl flex items-center justify-center border border-[var(--border-color)]">
                      <span className="text-xs text-[var(--text-secondary)] font-bold">Mock Up Image Preview</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-t border-[var(--border-color)] space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-sm font-extrabold text-[#2563EB] uppercase tracking-widest">Everything You Need To Scale</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">Full-Stack Social Autopilot Capabilities</p>
            <p className="text-base text-[var(--text-secondary)] font-medium leading-relaxed">Manage all your social media accounts in one powerful dashboard with AI-driven content compaction and automated scheduling</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-7 shadow-sm hover:border-[#2563EB] hover:shadow-xl transition-all duration-300 group">
              <div className="bg-[#2563EB]/10 group-hover:bg-[#2563EB] p-4 rounded-2xl text-[#2563EB] group-hover:text-white transition-all w-fit mb-5">
                <Brain className="h-7 w-7" />
              </div>
              <h3 className="font-extrabold text-lg text-[var(--text-primary)] mb-2.5">Anti-Repetitive Memory Engine</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-normal">
                Prevents duplicate posts. Our AI compaction engine analyzes recently published content to maintain brand tone while generating fresh, original ideas every single day.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-7 shadow-sm hover:border-[#2563EB] hover:shadow-xl transition-all duration-300 group">
              <div className="bg-emerald-500/10 group-hover:bg-emerald-500 p-4 rounded-2xl text-emerald-500 group-hover:text-white transition-all w-fit mb-5">
                <Users className="h-7 w-7" />
              </div>
              <h3 className="font-extrabold text-lg text-[var(--text-primary)] mb-2.5">Multi-Channel Adaptive Composer</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-normal">
                Enter a single prompt topic and adapt it instantly for Instagram (emojis & hashtags), LinkedIn (thought leadership), X (tweets & threads), or Facebook.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-7 shadow-sm hover:border-[#2563EB] hover:shadow-xl transition-all duration-300 group">
              <div className="bg-cyan-500/10 group-hover:bg-cyan-500 p-4 rounded-2xl text-cyan-500 group-hover:text-white transition-all w-fit mb-5">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h3 className="font-extrabold text-lg text-[var(--text-primary)] mb-2.5">AES-256-GCM Bank Security</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-normal">
                SaaS-grade database encryption. Social OAuth tokens and account credentials are encrypted with native authenticated AES algorithms before saving.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-7 shadow-sm hover:border-[#2563EB] hover:shadow-xl transition-all duration-300 group">
              <div className="bg-amber-500/10 group-hover:bg-amber-500 p-4 rounded-2xl text-amber-500 group-hover:text-white transition-all w-fit mb-5">
                <Clock className="h-7 w-7" />
              </div>
              <h3 className="font-extrabold text-lg text-[var(--text-primary)] mb-2.5">BullMQ & Redis Scheduler</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-normal">
                Asynchronous posting queue pipeline. Automatically dispatches your queued publications at peak engagement slots without missing a single post.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-7 shadow-sm hover:border-[#2563EB] hover:shadow-xl transition-all duration-300 group">
              <div className="bg-[#2563EB]/10 group-hover:bg-[#2563EB] p-4 rounded-2xl text-[#2563EB] group-hover:text-white transition-all w-fit mb-5">
                <Sliders className="h-7 w-7" />
              </div>
              <h3 className="font-extrabold text-lg text-[var(--text-primary)] mb-2.5">Team & Agency Control</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-normal">
                Role-Based Access Control. Manage multiple client workspaces, set approval permissions, and trigger on-demand autopilot cycles seamlessly.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-7 shadow-sm hover:border-[#2563EB] hover:shadow-xl transition-all duration-300 group">
              <div className="bg-rose-500/10 group-hover:bg-rose-500 p-4 rounded-2xl text-rose-500 group-hover:text-white transition-all w-fit mb-5">
                <Layers className="h-7 w-7" />
              </div>
              <h3 className="font-extrabold text-lg text-[var(--text-primary)] mb-2.5">Media Upload Pipeline</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-normal">
                HD media uploads standardized to Cloudinary CDN storage. Attach high-resolution images and videos to make your social posts stand out.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="max-w-7xl mx-auto px-6 py-20 border-t border-[var(--border-color)] space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-sm font-extrabold text-[#2563EB] uppercase tracking-widest">Subscription Pricing</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">Simple, transparent, developer-friendly tiers</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free plan */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-8 space-y-6 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-xl text-[var(--text-primary)]">Starter Free</h3>
                  <span className="text-xs text-[var(--text-secondary)] block uppercase font-bold mt-1">15 credits/month</span>
                </div>
                <span className="text-3xl font-black text-[var(--text-primary)]">$0</span>
              </div>
              <ul className="text-sm text-[var(--text-secondary)] space-y-3 leading-relaxed font-medium">
                <li>✔ Basic AI social post composer</li>
                <li>✔ Connect up to 2 social accounts</li>
                <li>✔ Manual post queuing and scheduling</li>
                <li>✖ Real-time AI Compactor checks</li>
              </ul>
              <Link 
                href="/signup"
                className="w-full py-3.5 rounded-2xl bg-[var(--bg-input)] hover:bg-[#2563EB] hover:text-white border border-[var(--border-color)] text-[var(--text-primary)] font-bold text-sm text-center block transition-all shadow-xs cursor-pointer"
              >
                Sign Up Free
              </Link>
            </div>

            {/* Premium plan */}
            <div className="bg-[#2563EB]/5 border-2 border-[#2563EB] rounded-3xl p-8 space-y-6 relative overflow-hidden shadow-xl">
              <div className="absolute top-4 right-4 bg-[#2563EB] text-white text-xs font-extrabold px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                Popular
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-xl text-[var(--text-primary)]">Autopilot Premium</h3>
                  <span className="text-xs text-[#2563EB] block uppercase font-extrabold mt-1">Unlimited credits</span>
                </div>
                <span className="text-3xl font-black text-[var(--text-primary)]">$29<span className="text-sm text-[var(--text-secondary)] font-semibold">/mo</span></span>
              </div>
              <ul className="text-sm text-[var(--text-secondary)] space-y-3 leading-relaxed font-medium">
                <li>✔ <strong>Autonomous Daily Autopilot Posting</strong></li>
                <li>✔ Connect unlimited social accounts</li>
                <li>✔ Anti-repetitive Memory Compactor Engine</li>
                <li>✔ HD media upload pipeline via Cloudinary</li>
              </ul>
              <Link 
                href="/signup"
                className="w-full py-3.5 rounded-2xl bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-sm text-center block shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
              >
                Upgrade to Premium
              </Link>
            </div>
          </div>
        </section>

        {/* High-Converting Electric Blue Bottom Conversion CTA Banner (Drital Hub Style) */}
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-gradient-to-r from-[#2563EB] via-blue-600 to-indigo-700 text-white rounded-3xl p-10 md:p-14 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 text-center md:text-left max-w-xl">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                Automate Your Social Media & Save Hours Every Week
              </h2>
              <p className="text-blue-100 text-sm md:text-base font-medium leading-relaxed">
                Connect your social channels today. Let AI format your posts, schedule content, and scale your organic presence automatically.
              </p>
            </div>

            <Link
              href="/signup"
              className="px-8 py-4 bg-white text-[#2563EB] hover:bg-slate-100 font-extrabold text-sm rounded-2xl shadow-xl transition-all hover:scale-105 shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <span>Get Started Free Now</span>
              <ArrowRight className="h-4.5 w-4.5" />
            </Link>
          </div>
        </section>

        <footer className="border-t border-[var(--border-color)] py-10 text-center text-xs text-[var(--text-secondary)]">
          <p>© {new Date().getFullYear()} OmniSync. Developed with verified modern SaaS aesthetics.</p>
        </footer>
      </div>
    );
}
