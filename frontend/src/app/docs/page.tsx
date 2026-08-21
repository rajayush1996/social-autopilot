'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Sparkles, 
  BookOpen, 
  Rocket, 
  Zap, 
  Brain, 
  Image as ImageIcon, 
  AlarmClock, 
  MessageSquare, 
  ShieldCheck, 
  HelpCircle, 
  Search, 
  ChevronRight, 
  CheckCircle2, 
  ArrowRight,
  ArrowLeft,
  Building2,
  ExternalLink,
  Layers,
  Clock,
  Lock,
  PenTool,
  Calendar,
  CreditCard,
  AlertCircle,
  Sliders,
  Check,
  Smartphone,
  Tag,
  UploadCloud,
  FileCode,
  Share2,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';

interface Section {
  id: string;
  title: string;
  shortTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  readTime: string;
  category: string;
}

const SECTIONS: Section[] = [
  { id: 'intro', title: '1. Introduction & Overview', shortTitle: 'Introduction', icon: Sparkles, readTime: '2 min read', category: 'Getting Started' },
  { id: 'quickstart', title: '2. 3-Minute Quick Start Checklist', shortTitle: 'Quick Start', icon: Rocket, readTime: '3 min read', category: 'Getting Started' },
  { id: 'channels', title: '3. Channels Setup & LinkedIn OAuth', shortTitle: 'Channels & LinkedIn', icon: Layers, readTime: '3 min read', category: 'Channels' },
  { id: 'settings', title: '4. Settings: Brand Identity & Autopilot', shortTitle: 'Brand & Autopilot Setup', icon: Building2, readTime: '4 min read', category: 'Configuration' },
  { id: 'composer-modes', title: '5. Composer: Single Post vs Autopilot', shortTitle: 'Composer Modes & Input', icon: PenTool, readTime: '4 min read', category: 'Post Composer' },
  { id: 'composer-studio', title: '6. Composer: Visuals, Tone & Smart Tags', shortTitle: 'Visual Studio & Smart Tags', icon: ImageIcon, readTime: '4 min read', category: 'Post Composer' },
  { id: 'composer-simulator', title: '7. Composer: Phone Simulator & Publishing', shortTitle: 'Phone Simulator & Publish', icon: Smartphone, readTime: '3 min read', category: 'Post Composer' },
  { id: 'schedules', title: '8. Schedule Manager & Slots', shortTitle: 'Schedules & Dispatcher', icon: Calendar, readTime: '3 min read', category: 'Automation' },
  { id: 'memory', title: '9. AI Anti-Repetitive Memory Compactor', shortTitle: 'Memory Compactor', icon: Brain, readTime: '3 min read', category: 'AI Intelligence' },
  { id: 'firstcomment', title: '10. Auto First-Comment Dwell Hack', shortTitle: 'First-Comment Hack', icon: MessageSquare, readTime: '2 min read', category: 'Growth Hacks' },
  { id: 'security', title: '11. Security, Tokens & Auto-Disconnect', shortTitle: 'Security & Token Health', icon: ShieldCheck, readTime: '2 min read', category: 'Security' },
  { id: 'billing-faq', title: '12. Credits, Billing & Troubleshooting', shortTitle: 'Billing & FAQs', icon: HelpCircle, readTime: '4 min read', category: 'Support' },
];

function DocsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const initialSectionId = searchParams.get('section') || 'intro';
  const [activeSectionId, setActiveSectionId] = useState(initialSectionId);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const s = searchParams.get('section');
    if (s && SECTIONS.some((sec) => sec.id === s)) {
      setActiveSectionId(s);
    }
  }, [searchParams]);

  const currentIndex = SECTIONS.findIndex((s) => s.id === activeSectionId);
  const activeSection = SECTIONS[currentIndex !== -1 ? currentIndex : 0];
  const prevSection = currentIndex > 0 ? SECTIONS[currentIndex - 1] : null;
  const nextSection = currentIndex < SECTIONS.length - 1 ? SECTIONS[currentIndex + 1] : null;

  const navigateToSection = (id: string) => {
    setActiveSectionId(id);
    router.push(`/docs?section=${id}`, { scroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredSections = SECTIONS.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] transition-colors duration-200 font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full bg-[var(--bg-card)]/90 backdrop-blur-2xl border-b border-[var(--border-color)] px-6 md:px-10 py-4 flex items-center justify-between shadow-xs">
        <BrandLogo href="/" size="md" subtitleText="User Guide & Configuration Portal" />

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="h-10 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Zap className="h-4 w-4" />
            <span>Go to Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Sticky Sidebar (Chapter Navigator) */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 sm:p-6 shadow-sm sticky top-24 space-y-4">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[#2563EB]" /> Configuration Guide
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 font-medium">
                Step-by-step UI tutorials for OmniSync
              </p>
            </div>

            {/* Quick Search Box */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guide (e.g. LinkedIn, Schedule)..."
                className="w-full h-10 pl-10 pr-3 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            {/* Chapter Progress Tracker */}
            <div className="p-3.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm font-extrabold">
                <span className="text-[var(--text-secondary)]">Tutorial Progress:</span>
                <span className="text-[#2563EB] dark:text-[#60A5FA]">
                  Chapter {currentIndex + 1} of {SECTIONS.length}
                </span>
              </div>
              <div className="h-2 w-full bg-[var(--border-color)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#2563EB] transition-all duration-300 rounded-full"
                  style={{ width: `${((currentIndex + 1) / SECTIONS.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Chapter Links */}
            <nav className="space-y-1 max-h-[52vh] overflow-y-auto pr-1">
              {filteredSections.map((sec) => {
                const IconComponent = sec.icon;
                const isActive = activeSectionId === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => navigateToSection(sec.id)}
                    className={`w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <IconComponent className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-[#2563EB]'}`} />
                      <span className="truncate">{sec.title}</span>
                    </div>
                    {isActive && (
                      <ChevronRight className="h-4 w-4 shrink-0 text-white" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Right Content View (Single Focused Section) */}
        <main className="lg:col-span-8 space-y-6">
          
          {/* Chapter Header Card */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-10 space-y-6 shadow-sm animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/25 text-[#2563EB] dark:text-[#60A5FA]">
                  {activeSection.category}
                </span>
                <span className="text-xs sm:text-sm text-[var(--text-secondary)] font-semibold">
                  • {activeSection.readTime}
                </span>
              </div>
              <span className="text-xs sm:text-sm font-extrabold text-[var(--text-secondary)]">
                Chapter {currentIndex + 1} / {SECTIONS.length}
              </span>
            </div>

            {/* Dynamic Focused Section Content */}
            <div>
              {activeSectionId === 'intro' && <IntroSection />}
              {activeSectionId === 'quickstart' && <QuickstartSection />}
              {activeSectionId === 'channels' && <ChannelsGuideSection />}
              {activeSectionId === 'settings' && <SettingsGuideSection />}
              {activeSectionId === 'composer-modes' && <ComposerModesSection />}
              {activeSectionId === 'composer-studio' && <ComposerStudioSection />}
              {activeSectionId === 'composer-simulator' && <ComposerSimulatorSection />}
              {activeSectionId === 'schedules' && <SchedulesGuideSection />}
              {activeSectionId === 'memory' && <MemorySection />}
              {activeSectionId === 'firstcomment' && <FirstCommentSection />}
              {activeSectionId === 'security' && <SecuritySection />}
              {activeSectionId === 'billing-faq' && <BillingFaqSection />}
            </div>
          </div>

          {/* Section-by-Section Pagination Footer Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Previous Section Button Card */}
            {prevSection ? (
              <button
                onClick={() => navigateToSection(prevSection.id)}
                className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[#2563EB] text-left transition-all group cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[var(--text-secondary)] font-bold mb-1">
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                  <span>Previous Chapter</span>
                </div>
                <div className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] group-hover:text-[#2563EB] transition-colors truncate">
                  {prevSection.title}
                </div>
              </button>
            ) : (
              <div />
            )}

            {/* Next Section Button Card */}
            {nextSection ? (
              <button
                onClick={() => navigateToSection(nextSection.id)}
                className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[#2563EB] text-right transition-all group cursor-pointer shadow-xs sm:col-start-2"
              >
                <div className="flex items-center justify-end gap-1.5 text-xs sm:text-sm text-[var(--text-secondary)] font-bold mb-1">
                  <span>Next Chapter</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] group-hover:text-[#2563EB] transition-colors truncate">
                  {nextSection.title}
                </div>
              </button>
            ) : (
              <Link
                href="/dashboard"
                className="p-5 rounded-2xl bg-[#2563EB] text-white text-right transition-all group cursor-pointer shadow-md sm:col-start-2 flex flex-col justify-center items-end"
              >
                <span className="text-xs sm:text-sm font-bold opacity-90">Guide Completed!</span>
                <span className="text-base sm:text-lg font-black flex items-center gap-2">
                  Launch Your Dashboard <ArrowRight className="h-5 w-5" />
                </span>
              </Link>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}

/* =========================================================================
   INDIVIDUAL DEEP-UI CONFIGURATION & HOW-TO COMPONENTS (STANDARD TYPOGRAPHY)
========================================================================= */

function IntroSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-[#2563EB]/15 text-[#2563EB] flex items-center justify-center font-bold">
          <Sparkles className="h-6 w-6 animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            1. Introduction to OmniSync Social Autopilot
          </h1>
          <p className="text-sm text-[var(--text-secondary)] font-medium mt-0.5">
            Autonomous multi-modal content scheduling and organic growth engine.
          </p>
        </div>
      </div>

      <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed font-medium">
        <strong>OmniSync</strong> is a full-stack social media autopilot designed to automate the entire lifecycle of organic social growth. Instead of manually writing posts every morning, OmniSync analyzes your brand niche, formulates high-engagement case studies and thought leadership posts, renders matching 3D visuals, and dispatches them directly to your live channels.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div className="p-5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-2">
          <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#2563EB]" /> 100% Autonomous Pipeline
          </h3>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-medium">
            Background BullMQ worker queues handle research, drafting, 3D image rendering, and live publishing without manual intervention.
          </p>
        </div>

        <div className="p-5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-2">
          <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Brain className="h-5 w-5 text-emerald-500" /> Never Repeats Topics
          </h3>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-medium">
            Built-in Campaign Memory ensures that companies and case studies never duplicate across your schedule.
          </p>
        </div>
      </div>
    </div>
  );
}

function QuickstartSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center font-bold">
          <Rocket className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            2. 3-Minute Quick Start Checklist
          </h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium mt-0.5">
            Follow these 3 simple steps to get your automated pipeline live.
          </p>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        {/* Step 1 */}
        <div className="p-5 sm:p-6 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-[#2563EB] text-white flex items-center justify-center text-sm font-black shrink-0">1</span>
              <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)]">Connect Your LinkedIn Channel</h3>
            </div>
            <Link href="/accounts" className="text-xs sm:text-sm text-[#2563EB] font-bold hover:underline flex items-center gap-1">
              Open Channels <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-medium">
            Open <strong>Channels (`/accounts`)</strong> ➔ Click <strong>&quot;Connect Account&quot;</strong> on LinkedIn ➔ Authorize the OAuth popup.
          </p>
        </div>

        {/* Step 2 */}
        <div className="p-5 sm:p-6 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-[#2563EB] text-white flex items-center justify-center text-sm font-black shrink-0">2</span>
              <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)]">Configure Brand Identity & Niche Context</h3>
            </div>
            <Link href="/settings" className="text-xs sm:text-sm text-[#2563EB] font-bold hover:underline flex items-center gap-1">
              Open Settings <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-medium">
            Open <strong>Settings (`/settings`)</strong> ➔ Enter your <strong>Brand Name</strong>, <strong>Logo Image URL</strong>, and describe your audience niche context.
          </p>
        </div>

        {/* Step 3 */}
        <div className="p-5 sm:p-6 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-[#2563EB] text-white flex items-center justify-center text-sm font-black shrink-0">3</span>
              <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)]">Enable Autopilot or Launch Composer</h3>
            </div>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Live Ready
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-medium">
            Toggle the <strong>Master Autopilot switch</strong> ON in Settings for recurring dispatches, or open <Link href="/composer" className="text-[#2563EB] font-bold hover:underline">Composer (`/composer`)</Link> to draft and post instantly!
          </p>
        </div>
      </div>
    </div>
  );
}

function ChannelsGuideSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-500 flex items-center justify-center font-bold">
          <Layers className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            3. Channels Setup & LinkedIn OAuth Guide
          </h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium mt-0.5">
            Managing connected social accounts, OAuth permissions, and token health.
          </p>
        </div>
      </div>

      <div className="space-y-4 pt-1">
        <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#2563EB]">Exact UI Connection Walkthrough:</h3>

        <div className="space-y-3 text-xs sm:text-sm text-[var(--text-secondary)]">
          <div className="p-4 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl space-y-1.5">
            <strong className="text-sm sm:text-base text-[var(--text-primary)] block">Step 1: Navigate to Channels</strong>
            <p>From the left sidebar, click on <Link href="/accounts" className="text-[#2563EB] font-bold hover:underline">Channels (/accounts)</Link>.</p>
          </div>

          <div className="p-4 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl space-y-1.5">
            <strong className="text-sm sm:text-base text-[var(--text-primary)] block">Step 2: Click &quot;Connect Account&quot;</strong>
            <p>On the <strong>LinkedIn</strong> channel card, click the blue <strong>&quot;Connect Account&quot;</strong> button. This opens the official LinkedIn OAuth authentication window.</p>
          </div>

          <div className="p-4 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl space-y-1.5">
            <strong className="text-sm sm:text-base text-[var(--text-primary)] block">Step 3: Authorize Permissions</strong>
            <p>Grant standard publishing permissions: <code>openid</code>, <code>profile</code>, <code>email</code>, and <code>w_member_social</code>. Click <strong>&quot;Allow&quot;</strong>.</p>
          </div>

          <div className="p-4 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl space-y-1.5">
            <strong className="text-sm sm:text-base text-[var(--text-primary)] block">Step 4: Status Indicator Confirmation</strong>
            <p>You will be redirected back with a green <strong>&quot;Connected&quot;</strong> pill, your profile name (`@Ayush Raj`), and token health monitor.</p>
          </div>
        </div>

        <div className="p-5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-2 text-xs sm:text-sm">
          <h4 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" /> Disconnecting or Reconnecting:
          </h4>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            If you ever need to refresh an expired token or revoke access, click the <strong>&quot;Disconnect&quot;</strong> button on the channel card. Tokens are stored encrypted with <strong>AES-256-GCM</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

function SettingsGuideSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-[#2563EB]/15 text-[#2563EB] flex items-center justify-center font-bold">
          <Building2 className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            4. Settings: Brand Identity & Autopilot Engine
          </h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium mt-0.5">
            Setup your brand assets, niche prompt instructions, and 2-stage review hours.
          </p>
        </div>
      </div>

      <div className="space-y-4 pt-1 text-xs sm:text-sm">
        <div className="p-5 sm:p-6 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-4">
          <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
            <Sliders className="h-4 w-4 text-[#2563EB]" /> Form Fields & UI Walkthrough:
          </h3>

          <div className="space-y-3">
            <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-1">
              <span className="font-bold text-[var(--text-primary)] text-sm sm:text-base">1. Master Autopilot Switch:</span>
              <p className="text-[var(--text-secondary)]">Toggle switch at the top right of the controls card. When ON (green), daily automated runs are active.</p>
            </div>

            <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-1">
              <span className="font-bold text-[var(--text-primary)] text-sm sm:text-base">2. Brand / Company Name:</span>
              <p className="text-[var(--text-secondary)]">Enter your brand name (e.g. <em>&quot;Ayush Raj&quot;</em> or <em>&quot;Avenar&quot;</em>). This is inherited by slide headers and post CTAs.</p>
            </div>

            <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-1">
              <span className="font-bold text-[var(--text-primary)] text-sm sm:text-base">3. Brand Logo / Avatar URL:</span>
              <p className="text-[var(--text-secondary)]">Paste your PNG/JPG logo link. A live square thumbnail preview appears next to the input to confirm the image loaded.</p>
            </div>

            <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-1.5">
              <span className="font-bold text-[var(--text-primary)] text-sm sm:text-base">4. Brand Niche, Voice & AI Context:</span>
              <p className="text-[var(--text-secondary)]">Describe your target audience and tone. Example prompt template:</p>
              <div className="p-3 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg font-mono text-xs sm:text-sm text-[var(--text-primary)] mt-1 leading-relaxed">
                &quot;We build B2B SaaS automation tools. Target audience: startup founders and tech leaders. Write growth teardowns, architectural insights, and actionable tips with clean formatting.&quot;
              </div>
            </div>

            <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-1">
              <span className="font-bold text-[var(--text-primary)] text-sm sm:text-base">5. 2-Stage Timing Window:</span>
              <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-1 mt-1">
                <li><strong>🌅 Stage 1 (Draft Time):</strong> e.g. <code>09:00 AM</code> — Time when AI synthesizes draft and sends review alerts.</li>
                <li><strong>🚀 Stage 2 (Live Publish Time):</strong> e.g. <code>08:00 PM</code> — Time when post is dispatched to live channels.</li>
                <li><strong>🌐 Timezone:</strong> Select your local timezone (e.g. <code>Asia/Kolkata (IST)</code>).</li>
              </ul>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center gap-2.5 p-3.5 bg-[#2563EB]/10 border border-[#2563EB]/25 rounded-xl font-bold text-[#2563EB] dark:text-[#60A5FA]">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>Click &quot;Save Autopilot Engine Settings&quot; to commit your changes!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComposerModesSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-violet-500/15 text-violet-500 flex items-center justify-center font-bold">
          <PenTool className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            5. Composer: Single Post vs Autopilot Schedule Modes
          </h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium mt-0.5">
            Switching between instant composition and recurring calendar schedules.
          </p>
        </div>
      </div>

      <div className="space-y-4 pt-1 text-xs sm:text-sm">
        <p className="text-[var(--text-secondary)] leading-relaxed font-medium">
          At the top of the <Link href="/composer" className="text-[#2563EB] font-bold hover:underline">Post Composer (/composer)</Link>, you will find the <strong>Master Mode Switcher</strong>:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#2563EB] text-white"><PenTool className="h-4 w-4" /></span>
              <h3 className="font-extrabold text-[var(--text-primary)] text-sm sm:text-base">Mode 1: Single Post</h3>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Use this mode for crafting an individual post right now. You enter a topic, customize formatting, review the live phone preview, and either publish immediately or pick a specific date/time.
            </p>
          </div>

          <div className="p-5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500 text-white"><AlarmClock className="h-4 w-4" /></span>
              <h3 className="font-extrabold text-[var(--text-primary)] text-sm sm:text-base">Mode 2: Auto-Pilot Schedule</h3>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Switches the view to the <strong>Scheduling Dispatcher</strong>, allowing you to configure recurring daily posting cadences, day-of-week slots (Mon–Fri), and inspect upcoming queue dispatches.
            </p>
          </div>
        </div>

        <div className="p-5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-3">
          <h4 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] uppercase tracking-wider">
            Input Sources & Starter Presets:
          </h4>
          <ul className="space-y-2.5 text-[var(--text-secondary)]">
            <li><strong>✍️ Custom Prompt Mode:</strong> Type any topic or angle (e.g. <em>&quot;Write a growth teardown of Loom&apos;s product virality&quot;</em>).</li>
            <li><strong>🔗 Summarize Article URL Mode:</strong> Paste any web article or blog link. The AI extracts the core insights and creates a punchy social post.</li>
            <li><strong>🚀 Quick Starter Presets:</strong> Click on <em>&quot;🚀 Product Launch&quot;</em>, <em>&quot;💡 Tech Insight&quot;</em>, or <em>&quot;📈 Growth Story&quot;</em> for instant prompt templates.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ComposerStudioSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold">
          <ImageIcon className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            6. Composer: Visual Studio, Tone & Smart Tags
          </h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium mt-0.5">
            Configuring 3D AI visuals, AI tones, length sliders, and dynamic placeholder tags.
          </p>
        </div>
      </div>

      <div className="space-y-4 pt-1 text-xs sm:text-sm">
        {/* Visual Media Studio */}
        <div className="p-5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-3">
          <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-[#2563EB]" /> Visual Media Studio (3 Modes):
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-1 text-center">
              <span className="font-extrabold text-[#2563EB] text-sm sm:text-base block">🎨 AI 3D Image</span>
              <p className="text-xs text-[var(--text-secondary)]">Fal.ai Flux.1 Schnell renders high-res 1024x1024 3D visuals matching the post in 2.6s.</p>
            </div>
            <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-1 text-center">
              <span className="font-extrabold text-emerald-500 text-sm sm:text-base block">📤 Upload Media</span>
              <p className="text-xs text-[var(--text-secondary)]">Upload your own product screenshots or brand infographics via Cloudinary.</p>
            </div>
            <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-1 text-center">
              <span className="font-extrabold text-[var(--text-secondary)] text-sm sm:text-base block">🚫 None (Text Only)</span>
              <p className="text-xs text-[var(--text-secondary)]">Publishes clean text-only thought leadership posts.</p>
            </div>
          </div>
        </div>

        {/* Tone Options */}
        <div className="p-5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-3">
          <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#2563EB]" /> AI Tone & Advanced Sliders:
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[var(--text-secondary)]">
            <li className="p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
              <strong className="text-[var(--text-primary)] text-sm block mb-0.5">Storytelling:</strong> Deep-dive case studies & growth breakdowns.
            </li>
            <li className="p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
              <strong className="text-[var(--text-primary)] text-sm block mb-0.5">Engaging:</strong> Conversational, punchy, and question-driven.
            </li>
            <li className="p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
              <strong className="text-[var(--text-primary)] text-sm block mb-0.5">Professional:</strong> Formal B2B enterprise perspective.
            </li>
            <li className="p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
              <strong className="text-[var(--text-primary)] text-sm block mb-0.5">Casual / Humorous:</strong> Witty, relatable, and authentic voice.
            </li>
          </ul>
        </div>

        {/* Smart Placeholders */}
        <div className="p-5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-2">
          <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
            <Tag className="h-4 w-4 text-[#2563EB]" /> Smart Dynamic Placeholders:
          </h3>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            You can insert dynamic variables into your prompts such as <code>&#123;&#123;LINK&#125;&#125;</code>, <code>&#123;&#123;WEBSITE&#125;&#125;</code>, or <code>&#123;&#123;AUTHOR_NAME&#125;&#125;</code>. OmniSync automatically resolves these variables during publishing!
          </p>
        </div>
      </div>
    </div>
  );
}

function ComposerSimulatorSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-500 flex items-center justify-center font-bold">
          <Smartphone className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            7. Composer: Live Phone Simulator & Publishing Controls
          </h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium mt-0.5">
            Real-time feed inspection, inline draft editing, and split publishing buttons.
          </p>
        </div>
      </div>

      <div className="space-y-4 pt-1 text-xs sm:text-sm">
        <div className="p-5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-3">
          <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
            <Eye className="h-4 w-4 text-[#2563EB]" /> Live Phone Simulator Features:
          </h3>
          <ul className="space-y-2 text-[var(--text-secondary)] leading-relaxed">
            <li><strong>📱 Native Feed Mockup:</strong> See exactly how your post appears on mobile devices before it ever goes live.</li>
            <li><strong>✏️ Inline Text Editing:</strong> You can click directly into the draft inside the simulator to edit words, adjust emojis, or reformat spacing.</li>
            <li><strong>📊 Real-Time Character Counter:</strong> Displays live character counts and alerts you if you approach platform limits.</li>
          </ul>
        </div>

        {/* Publishing Split Button */}
        <div className="p-5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-3">
          <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#2563EB]" /> Publishing Split Controls:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-1">
              <strong className="text-[#2563EB] text-sm sm:text-base block">🚀 Publish Now</strong>
              <p className="text-xs text-[var(--text-secondary)]">Dispatches the post immediately to your connected channels via live REST APIs.</p>
            </div>
            <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl space-y-1">
              <strong className="text-indigo-500 text-sm sm:text-base block">⏰ Schedule for Later</strong>
              <p className="text-xs text-[var(--text-secondary)]">Opens a datetime picker to queue the post for an exact future date and time.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SchedulesGuideSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold">
          <Calendar className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            8. Schedule Manager & Automated Recurring Slots
          </h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium mt-0.5">
            Setting up daily recurring time slots and managing BullMQ dispatch queues.
          </p>
        </div>
      </div>

      <div className="space-y-4 pt-1 text-xs sm:text-sm">
        <div className="p-5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-3">
          <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] uppercase tracking-wider">
            How to Create a Recurring Schedule:
          </h3>
          <ol className="space-y-2 list-decimal list-inside text-[var(--text-secondary)] leading-relaxed">
            <li>Open <Link href="/posts" className="text-[#2563EB] font-bold hover:underline">Schedule (/posts)</Link> from the left sidebar.</li>
            <li>In the <strong>Scheduling Dispatcher</strong>, click <strong>&quot;Create Schedule Slot&quot;</strong>.</li>
            <li>Select the <strong>Days of the Week</strong> (e.g. <code>MON, TUE, WED, THU, FRI</code>).</li>
            <li>Set the <strong>Dispatch Time</strong> (e.g. <code>21:00 / 9:00 PM</code>).</li>
            <li>Choose <strong>Image Mode</strong>: <em>AI Flux.1 Schnell</em> (auto 3D visuals) or <em>None</em>.</li>
            <li>Click <strong>&quot;Save Schedule&quot;</strong>. The background worker queues the job in Redis and displays the next execution timestamp.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function MemorySection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-500 flex items-center justify-center font-bold">
          <Brain className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            9. AI Anti-Repetitive Memory Compactor
          </h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium mt-0.5">
            How the engine guarantees fresh, diverse content across daily schedule cycles.
          </p>
        </div>
      </div>

      <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed font-medium">
        Every time OmniSync generates a post, it extracts the featured brand and core hook. This metadata is saved to <strong>Campaign Memory</strong>.
      </p>

      <div className="p-5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-2.5 text-xs sm:text-sm font-mono">
        <p className="text-[var(--text-primary)] font-bold text-sm sm:text-base">🧠 How Compaction Memory Works:</p>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          1. Post Generated ➔ Detects Brand: &quot;Zapier&quot; ➔ Added to Exclusions List.<br />
          2. Next Day Run ➔ Injects: <em>&quot;Do NOT repeat Zapier, Airmeet, Loom... Pick a fresh company (e.g. Figma, Supabase, Canva).&quot;</em><br />
          3. Result ➔ 100% unique topics every single day!
        </p>
      </div>
    </div>
  );
}

function FirstCommentSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-500 flex items-center justify-center font-bold">
          <MessageSquare className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            10. Auto First-Comment Dwell Time Hack
          </h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium mt-0.5">
            Boost early discussion signals and initial reach algorithmically.
          </p>
        </div>
      </div>

      <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed font-medium">
        After a post publishes to LinkedIn, OmniSync waits 4.5 to 9 seconds (human jitter delay) and automatically posts a contextually relevant <strong>First Comment</strong>.
      </p>
      
      <div className="p-5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
        💡 <strong className="text-[var(--text-primary)]">Why this matters:</strong> The LinkedIn algorithm rewards posts that spark immediate conversation. A thoughtful first comment signals to the algorithm that the post is active, increasing its distribution to 2nd and 3rd-degree connections.
      </div>
    </div>
  );
}

function SecuritySection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center font-bold">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            11. Security, Tokens & Auto-Disconnect
          </h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium mt-0.5">
            Bank-grade encryption and self-healing token maintenance.
          </p>
        </div>
      </div>

      <ul className="space-y-3 text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
        <li className="flex items-start gap-2.5 p-3.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl">
          <Lock className="h-4 w-4 text-[#2563EB] shrink-0 mt-0.5" />
          <span><strong>AES-256-GCM Token Encryption:</strong> All OAuth tokens and refresh tokens are encrypted at rest with unique initialization vectors (IVs).</span>
        </li>
        <li className="flex items-start gap-2.5 p-3.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl">
          <Clock className="h-4 w-4 text-[#2563EB] shrink-0 mt-0.5" />
          <span><strong>Proactive Daily Token Sweep:</strong> The background token refresh job automatically scans and renews tokens expiring within 7 days.</span>
        </li>
        <li className="flex items-start gap-2.5 p-3.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl">
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <span><strong>Auto-Disconnect Shield:</strong> If a token is revoked by the user on LinkedIn, the system gracefully deactivates the account and alerts you via WebSocket without crashing.</span>
        </li>
      </ul>
    </div>
  );
}

function BillingFaqSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-bold">
          <HelpCircle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            12. Credits, Billing & Troubleshooting FAQs
          </h2>
          <p className="text-sm text-[var(--text-secondary)] font-medium mt-0.5">
            Managing credits, upgrading subscription tiers, and fixing common errors.
          </p>
        </div>
      </div>

      <div className="space-y-4 pt-1 text-xs sm:text-sm">
        <div className="p-5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-1.5">
          <h4 className="font-bold text-[var(--text-primary)] text-sm sm:text-base">How do AI Credits work?</h4>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Every user starts with 15 free welcome credits. Each AI text post with 3D image synthesis consumes 1 credit. Premium users receive unlimited automated daily dispatches.
          </p>
        </div>

        <div className="p-5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-1.5">
          <h4 className="font-bold text-[var(--text-primary)] text-sm sm:text-base">What if LinkedIn returns a token expiration error?</h4>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Simply open <Link href="/accounts" className="text-[#2563EB] font-bold hover:underline">Channels (/accounts)</Link>, click <strong>&quot;Reconnect Account&quot;</strong> on LinkedIn, and re-authorize.
          </p>
        </div>

        <div className="p-5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-1.5">
          <h4 className="font-bold text-[var(--text-primary)] text-sm sm:text-base">Can I edit an AI-generated scheduled post before it goes live?</h4>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Yes! In <Link href="/posts" className="text-[#2563EB] font-bold hover:underline">Schedule (/posts)</Link>, click any scheduled draft to edit its caption, adjust the image, or update the scheduled time.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DocumentationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center text-xs text-[var(--text-secondary)]">Loading Documentation...</div>}>
      <DocsContent />
    </Suspense>
  );
}
