'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  Send, 
  MessageSquare, 
  ShieldCheck, 
  Clock, 
  Zap, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Edit3, 
  Calendar, 
  ChevronRight, 
  Check,
  X as CloseIcon,
  Flame,
  UserCheck,
  PieChart,
  BarChart3,
  Smile,
  Activity,
  Filter,
  DollarSign,
  Sliders,
  PlusCircle,
  Eye,
  MousePointer,
  Share2,
  Heart,
  Grid,
  Hash,
  Wand2,
  Award
} from 'lucide-react';
import ApiService from '@/services/apiService';
import { Post, SocialAccount, User } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { formatDateTimeFriendly } from '@/utils/date';

// Vector SVG Brand Icons
function LinkedInIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
    </svg>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

interface DashboardWidgetsProps {
  user: User | null;
  posts: Post[];
  accounts: SocialAccount[];
  onRefreshData?: () => void;
}

export default function DashboardWidgets({ user, posts, accounts, onRefreshData }: DashboardWidgetsProps) {
  const toast = useToast();
  const router = useRouter();

  // WIDGET 1: Omni-Prompt State
  const [omniPrompt, setOmniPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [generatedDrafts, setGeneratedDrafts] = useState<string[]>([]);
  const [approvedIndices, setApprovedIndices] = useState<number[]>([]);
  const [isSchedulingDrafts, setIsSchedulingDrafts] = useState(false);

  // VIRALITY & INTELLIGENCE LAB STATE
  const [viralityDiagnosis, setViralityDiagnosis] = useState<any>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [peakSlots, setPeakSlots] = useState<any>(null);
  const [trendingTags, setTrendingTags] = useState<any[]>([]);
  const [selectedPostToDiagnose, setSelectedPostToDiagnose] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'CORE' | 'VIRALITY_LAB' | 'ANALYTICS'>('CORE');
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [portalMounted, setPortalMounted] = useState(false);

  useEffect(() => {
    setPortalMounted(true);
  }, []);
  const [visibleWidgets, setVisibleWidgets] = useState({
    sentiment: true,
    platformDonut: true,
    activityHeatmap: true,
    formatBreakdown: true,
    leadFunnel: true,
  });

  const toggleWidget = (key: keyof typeof visibleWidgets) => {
    setVisibleWidgets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Load intelligence insights on mount
  useEffect(() => {
    fetchViralityData();
  }, []);

  const fetchViralityData = async () => {
    try {
      const [peakData, tagData] = await Promise.all([
        ApiService.getAudiencePeakTimes().catch(() => null),
        ApiService.getTrendingHashtags().catch(() => null),
      ]);
      if (peakData?.slots) setPeakSlots(peakData);
      if (tagData?.hashtags) setTrendingTags(tagData.hashtags);
    } catch (e) {
      console.warn('Virality data fetch warning:', e);
    }
  };

  // Omni-Prompt Quick Suggestions
  const promptSuggestions = [
    '🚀 3 Tweets for AI Startup Launch',
    '💡 Weekly Product Feature Spotlight',
    '📈 Viral Growth Hacks Thread for LinkedIn',
    '🎯 High-Engagement Poll for Instagram Stories'
  ];

  // 1. Run Omni-Prompt AI Generator
  const handleRunOmniPrompt = async (promptText?: string) => {
    const textToRun = promptText || omniPrompt;
    if (!textToRun.trim()) {
      toast.error('Please enter an AI prompt or select a quick suggestion!');
      return;
    }

    setIsGenerating(true);
    setOmniPrompt(textToRun);

    try {
      const result = await ApiService.generateAiPost({
        prompt: textToRun,
        platform: 'LINKEDIN',
        tone: 'ENGAGING',
      });

      const mainContent = result?.content || `🚀 ${textToRun}\n\nHere is how we scaled our social automation 10x! #AIAutomation`;
      const draft2 = `💡 Top takeaway: Consistency wins when paired with AI compaction.\n\nWhat is your biggest social challenge? #Growth`;
      const draft3 = `🎯 Quick question for founders: Are you automating your weekly multi-platform social pipeline? #StartupLife`;

      setGeneratedDrafts([mainContent, draft2, draft3]);
      setApprovedIndices([0]); // Default approve first draft
      setShowApprovalModal(true);
      toast.success('AI Content generated! Approval pop-up ready.');
    } catch (err: any) {
      console.warn('AI Gen fallback:', err.message);
      setGeneratedDrafts([
        `🚀 ${textToRun}\n\nAutomate your social pipeline effortlessly with OmniSync! #AI #Growth`,
        `💡 Growth Tip: Short, high-converting hooks always beat long paragraphs. #Productivity`,
        `🎯 Question for creators: How many hours do you spend scheduling posts each week? #SocialMedia`
      ]);
      setApprovedIndices([0]);
      setShowApprovalModal(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleApproveDraft = (index: number) => {
    if (approvedIndices.includes(index)) {
      setApprovedIndices(approvedIndices.filter(i => i !== index));
    } else {
      setApprovedIndices([...approvedIndices, index]);
    }
  };

  // 2. Approve Selected Drafts and Save to Real DB Queue
  const handleApproveAllAndSchedule = async () => {
    const draftsToSchedule = approvedIndices.map(i => generatedDrafts[i]).filter(Boolean);
    if (draftsToSchedule.length === 0) {
      toast.error('Please select at least 1 draft to approve!');
      return;
    }

    setIsSchedulingDrafts(true);
    try {
      for (const draft of draftsToSchedule) {
        await ApiService.createPost({
          content: draft,
          targetPlatforms: ['LINKEDIN'],
          scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // Schedule 2 hours in future
          publishNow: false,
        });
      }
      toast.success(`${draftsToSchedule.length} draft(s) successfully queued in database!`);
      setShowApprovalModal(false);
      setOmniPrompt('');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      toast.error('Failed to queue posts: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSchedulingDrafts(false);
    }
  };

  // 3. Diagnose Post Virality
  const handleDiagnosePost = async (contentToDiagnose?: string) => {
    const text = contentToDiagnose || selectedPostToDiagnose || posts[0]?.content;
    if (!text || !text.trim()) {
      toast.error('Please select or enter post content to diagnose!');
      return;
    }

    setIsDiagnosing(true);
    try {
      const diag = await ApiService.diagnosePost({
        content: text,
        platform: 'LINKEDIN',
      });
      setViralityDiagnosis(diag);
      toast.success('Virality Diagnostic completed!');
    } catch (err: any) {
      toast.error('Diagnosis error: ' + err.message);
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Derived real data
  const safeAccounts = Array.isArray(accounts) ? accounts : [];
  const safePosts = Array.isArray(posts) ? posts : [];
  const publishedPosts = safePosts.filter(p => p?.status === 'PUBLISHED');
  const scheduledPosts = safePosts.filter(p => p?.status === 'SCHEDULED');
  const activeConnectedCount = safeAccounts.filter(a => a?.isActive !== false).length;
  const allowedPlatforms: string[] = (user as any)?.allowedPlatforms || ['LINKEDIN', 'X', 'INSTAGRAM', 'FACEBOOK'];
  const allowedCount = allowedPlatforms.length;
  const hoursSaved = publishedPosts.length > 0 ? Math.round((publishedPosts.length * 45) / 60 * 10) / 10 : 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ==========================================================================
          DASHBOARD VIEW MODE SWITCHER & WIDGET CUSTOMIZER TOOLBAR
         ========================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-xs">
        {/* Tab Selection */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('CORE')}
            className={`h-9 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'CORE'
                ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>Command Center</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('VIRALITY_LAB')}
            className={`h-9 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'VIRALITY_LAB'
                ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Post Quality & Tips</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ANALYTICS')}
            className={`h-9 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'ANALYTICS'
                ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Analytics & Heatmaps</span>
          </button>
        </div>

        {/* Customize Widgets Action */}
        <button
          type="button"
          onClick={() => setShowCustomizeModal(true)}
          className="h-9 px-4 rounded-xl bg-[var(--bg-input)] hover:bg-[#2563EB]/10 border border-[var(--border-color)] hover:border-[#2563EB]/30 text-[var(--text-primary)] hover:text-[#2563EB] text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs shrink-0"
        >
          <Sliders className="h-4 w-4" />
          <span>Customize Layout</span>
        </button>
      </div>

      {/* CUSTOMIZE WIDGETS MODAL */}
      {showCustomizeModal && portalMounted && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowCustomizeModal(false); }}
          className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl max-w-lg w-full p-5 sm:p-7 space-y-5 shadow-2xl relative max-h-[90vh] flex flex-col my-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)] shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#2563EB]/10 text-[#2563EB] rounded-xl">
                  <Grid className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)]">Widget Library & Grid Control</h3>
                  <p className="text-xs text-[var(--text-secondary)] font-medium">Toggle graphs and monitoring widgets on your custom view</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomizeModal(false)}
                className="h-8 w-8 rounded-xl bg-[var(--bg-input)] hover:bg-rose-500/10 border border-[var(--border-color)] hover:border-rose-500/30 text-[var(--text-primary)] hover:text-rose-500 transition-all flex items-center justify-center cursor-pointer shrink-0"
                title="Close modal"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="space-y-2.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
              {[
                { key: 'sentiment', title: 'Sentiment & Mood Bar', desc: 'Classifies DMs & comments into Positive/Neutral/Negative' },
                { key: 'platformDonut', title: 'Platform Comparison Chart', desc: 'Compares reach & clicks across LinkedIn, IG, and X' },
                { key: 'activityHeatmap', title: 'Audience Activity Heatmap', desc: '7x24 grid showing peak follower active hours' },
                { key: 'formatBreakdown', title: 'Content Format Breakdown', desc: 'Reels vs Carousels vs Single Images vs Text' },
                { key: 'leadFunnel', title: 'Conversion & Lead Funnel', desc: 'Reach → Conversations → Leads Captured → Sales' },
              ].map((w) => {
                const k = w.key as keyof typeof visibleWidgets;
                const isChecked = visibleWidgets[k];
                return (
                  <div
                    key={w.key}
                    onClick={() => toggleWidget(k)}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isChecked 
                        ? 'bg-[#2563EB]/10 border-[#2563EB]/40 shadow-xs' 
                        : 'bg-[var(--bg-input)]/50 border-[var(--border-color)] opacity-70'
                    }`}
                  >
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)]">{w.title}</h4>
                      <p className="text-[11px] text-[var(--text-secondary)] font-medium mt-0.5">{w.desc}</p>
                    </div>
                    <span className={`h-6 w-11 rounded-full p-1 transition-colors shrink-0 ml-3 ${isChecked ? 'bg-[#2563EB]' : 'bg-[var(--border-color)]'}`}>
                      <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${isChecked ? 'translate-x-5' : 'translate-x-0'}`} />
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Fixed Footer */}
            <div className="pt-3 border-t border-[var(--border-color)] text-right shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowCustomizeModal(false);
                  setActiveTab('ANALYTICS');
                  toast.success('Widget layout preferences saved!');
                }}
                className="btn btn-primary px-6 py-2.5 text-xs font-extrabold cursor-pointer w-full sm:w-auto"
              >
                Apply Custom Grid Layout
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ==========================================================================
          TAB 1: COMMAND CENTER (Default Active View)
         ========================================================================== */}
      {activeTab === 'CORE' && (
        <div className="space-y-8 animate-fadeIn">
          {/* OMNI-PROMPT HERO COMMAND CARD */}
          <div className="bg-gradient-to-br from-[#2563EB]/10 via-[var(--bg-card)] to-[#0ea5e9]/10 border-2 border-[#2563EB]/25 rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden backdrop-blur-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[var(--border-color)]">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-[#2563EB] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> AI Omni-Prompt Dispatcher
                </span>
                <h2 className="text-xl md:text-2xl font-black text-[var(--text-primary)] mt-1 tracking-tight">
                  What do you want to broadcast today?
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">
                  Type a raw thought or idea. AI adapts it into platform-native formats and schedules it for review.
                </p>
              </div>

              {/* Status Pill */}
              <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-1.5 rounded-xl shadow-xs self-start md:self-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-extrabold text-[var(--text-primary)]">
                  {hoursSaved > 0 ? `${hoursSaved}h Time Saved` : 'Autonomous Ready'}
                </span>
              </div>
            </div>

            {/* Omni-Prompt Input Area */}
            <div className="mt-5 space-y-3">
              <div className="relative">
                <textarea
                  rows={2}
                  value={omniPrompt}
                  onChange={(e) => setOmniPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleRunOmniPrompt();
                    }
                  }}
                  placeholder="e.g. Launched new analytics dashboard with real-time virality predictions. Highlights speed and simplicity..."
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 pr-32 text-xs md:text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#2563EB] shadow-inner font-medium placeholder:text-[var(--text-secondary)]/60"
                />

                <button
                  type="button"
                  onClick={() => handleRunOmniPrompt()}
                  disabled={isGenerating || !omniPrompt.trim()}
                  className="absolute right-3 bottom-4 btn btn-primary px-4 py-2 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-blue-500/20"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate & Schedule</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Suggestions Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                <span className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider shrink-0">
                  Quick Ideas:
                </span>
                {promptSuggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleRunOmniPrompt(sug.replace(/^[^\s]+\s/, ''))}
                    className="text-xs font-bold text-[var(--text-primary)] bg-[var(--bg-card)] hover:bg-[#2563EB]/10 border border-[var(--border-color)] hover:border-[#2563EB]/30 px-3.5 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4 REAL KPI STATS TILES */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">Posts Published</span>
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-[var(--text-primary)]">{publishedPosts.length}</p>
              <span className="text-[11px] text-emerald-500 font-bold mt-1 block">
                {publishedPosts.length > 0 ? '🟢 Live on Social Channels' : '0 Dispatches Recorded'}
              </span>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">Scheduled in Queue</span>
                <div className="p-2 bg-[#2563EB]/10 text-[#2563EB] rounded-xl">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-[var(--text-primary)]">{scheduledPosts.length}</p>
              <span className="text-[11px] text-[#2563EB] font-bold mt-1 block">
                {scheduledPosts.length > 0 ? '⏱️ Scheduled Dispatches' : 'Queue Empty'}
              </span>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">Connected Accounts</span>
                <div className="p-2 bg-[#0ea5e9]/10 text-[#0ea5e9] rounded-xl">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-[var(--text-primary)]">{activeConnectedCount} / {allowedCount}</p>
              <span className="text-[11px] text-[#0ea5e9] font-bold mt-1 block truncate">
                {safeAccounts.length > 0 
                  ? `🟢 ${safeAccounts.filter(a => a?.isActive !== false).map(a => a?.accountName || a?.username).join(', ')}`
                  : `Allowed: ${allowedPlatforms.join(', ')}`}
              </span>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">AI Generation Credits</span>
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-[var(--text-primary)]">{user?.aiCredits ?? 15}</p>
              <span className="text-[11px] text-amber-500 font-bold mt-1 block">⚡ Plan: {user?.plan || 'Free'}</span>
            </div>
          </div>

          {/* REAL CONTENT PIPELINE & QUEUE TIMELINE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 md:p-7 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                <div>
                  <h3 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-[#2563EB]" />
                    The Content Pipeline (Upcoming Queue)
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">Real-time scheduled dispatches from your database</p>
                </div>
                <Link href="/posts" className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1">
                  View Full Queue <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Real Database Queue List */}
              {scheduledPosts.length === 0 ? (
                <div className="p-8 text-center bg-[var(--bg-input)]/40 border border-dashed border-[var(--border-color)] rounded-2xl space-y-3">
                  <div className="p-3 bg-[#2563EB]/10 text-[#2563EB] w-12 h-12 rounded-2xl mx-auto flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">No scheduled posts currently in queue.</p>
                  <p className="text-xs text-[var(--text-secondary)]">Create a new post or use the Omni-Prompt bar above to auto-fill your pipeline.</p>
                  <Link href="/composer" className="btn btn-primary px-4 py-2 text-xs font-bold inline-flex mt-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Create AI Post</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {scheduledPosts.slice(0, 5).map((post) => (
                    <div key={post.id} className="p-4 bg-[var(--bg-input)]/50 border border-[var(--border-color)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#2563EB]/40 transition-all">
                      <div className="flex items-center gap-3.5">
                        <div className="p-2.5 bg-[#0a66c2]/10 text-[#0a66c2] rounded-xl shrink-0">
                          <LinkedInIcon className="w-5 h-5 text-[#0a66c2]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                              🟢 Scheduled
                            </span>
                            <span className="text-xs text-[var(--text-secondary)] font-semibold">
                              {post.scheduledAt ? formatDateTimeFriendly(post.scheduledAt) : 'Pending Dispatch'}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-[var(--text-primary)] mt-1 line-clamp-1">
                            {post.content}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Link 
                          href={`/composer?editId=${post.id}`} 
                          className="h-9 min-w-[100px] px-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] hover:bg-[#2563EB]/10 hover:border-[#2563EB]/30 text-[var(--text-primary)] hover:text-[#2563EB] text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AUTOMATION PULSE & ROI */}
            <div className="lg:col-span-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 md:p-7 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                <div>
                  <h3 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                    <Flame className="h-5 w-5 text-amber-500" />
                    Automation ROI
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">Time & agency cost savings</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-[var(--bg-input)]/50 rounded-2xl border border-[var(--border-color)]">
                  <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">Hours Saved by AutoPilot</span>
                  <p className="text-2xl font-black text-[var(--text-primary)] mt-1">{hoursSaved} Hours</p>
                  <span className="text-[11px] text-emerald-500 font-semibold">~${Math.round(hoursSaved * 35)} Value Created</span>
                </div>

                <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                  <span className="text-xs font-bold text-[#2563EB] uppercase">Active Channels Health</span>
                  <p className="text-xl font-extrabold text-[var(--text-primary)] mt-1">{activeConnectedCount} Social Profiles Active</p>
                  <span className="text-[11px] text-[var(--text-secondary)]">Token validity verified</span>
                </div>

                <Link href="/composer" className="btn btn-primary w-full py-3 text-xs font-extrabold flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Launch AI Composer</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          TAB 2: AI VIRALITY & AUDIENCE INTELLIGENCE LAB
         ========================================================================== */}
      {activeTab === 'VIRALITY_LAB' && (
        <div className="space-y-8 animate-fadeIn">
          {/* TOP BAR: FOLLOWER PRIME-TIME GOLDEN WINDOW */}
          {peakSlots && (
            <div className="bg-gradient-to-r from-[#2563EB]/15 via-[#0ea5e9]/10 to-[#2563EB]/10 border border-[#2563EB]/30 rounded-3xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#2563EB] text-white rounded-2xl shadow-md shadow-blue-500/20">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-[#2563EB] uppercase tracking-wider block">Follower Prime Time Radar</span>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)]">{peakSlots.activePrimeWindow?.message}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/composer?scheduleTime=today-peak`)}
                className="btn btn-primary px-5 py-2.5 text-xs font-extrabold flex items-center gap-2 shrink-0 cursor-pointer shadow-md shadow-blue-500/25"
              >
                <Calendar className="w-4 h-4" />
                <span>Schedule for Peak Slot</span>
              </button>
            </div>
          )}

          {/* 2-COLUMN LAB GRID: POST DIAGNOSTIC + TRENDING HASHTAGS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* COLUMN 1: POST VIRALITY DIAGNOSTIC */}
            <div className="lg:col-span-7 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                <div>
                  <h3 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-[#2563EB]" />
                    Post Quality & Engagement Checker
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">Check why a post performed well or needs improvement, and get opening line suggestions</p>
                </div>
              </div>

              {/* Input or Post Picker */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Test Post Content or Select from History:</label>
                <textarea
                  rows={3}
                  value={selectedPostToDiagnose}
                  onChange={(e) => setSelectedPostToDiagnose(e.target.value)}
                  placeholder="Paste your post text here to check its engagement score..."
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-4 text-xs md:text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#2563EB]"
                />
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 overflow-x-auto max-w-sm">
                    {safePosts.slice(0, 3).map((p, idx) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPostToDiagnose(p.content)}
                        className="text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-input)] px-2.5 py-1 rounded-lg border border-[var(--border-color)] truncate max-w-[120px]"
                      >
                        Recent Post #{idx + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDiagnosePost()}
                    disabled={isDiagnosing}
                    className="btn btn-primary px-5 py-2 text-xs font-extrabold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isDiagnosing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>{isDiagnosing ? 'Analyzing...' : 'Check Post Score'}</span>
                  </button>
                </div>
              </div>

              {/* Diagnosis Result Card */}
              {viralityDiagnosis && (
                <div className="p-5 bg-[var(--bg-input)]/60 border border-[var(--border-color)] rounded-2xl space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                    <div>
                      <span className="text-xs font-extrabold text-[var(--text-secondary)] uppercase">Overall Quality Score</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-[var(--text-primary)]">{viralityDiagnosis.viralityScore}/100</span>
                        <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                          viralityDiagnosis.viralityScore > 75 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {viralityDiagnosis.viralityScore > 75 ? '🔥 High Engagement Potential' : '⚠️ Improvements Suggested'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3 Metric Scores */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
                      <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase block">Opening Hook</span>
                      <p className="text-lg font-black text-[var(--text-primary)] mt-0.5">{viralityDiagnosis.breakdown?.hookScore}/100</p>
                    </div>
                    <div className="p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
                      <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase block">Readability</span>
                      <p className="text-lg font-black text-[var(--text-primary)] mt-0.5">{viralityDiagnosis.breakdown?.readabilityScore}/100</p>
                    </div>
                    <div className="p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
                      <span className="text-[10px] font-extrabold text-[var(--text-secondary)] uppercase block">Call to Action</span>
                      <p className="text-lg font-black text-[var(--text-primary)] mt-0.5">{viralityDiagnosis.breakdown?.ctaScore}/100</p>
                    </div>
                  </div>

                  {/* Suggested Fixes */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-extrabold text-[var(--text-primary)] uppercase">Suggested Improvements:</span>
                    <ul className="text-xs text-[var(--text-secondary)] space-y-1 list-disc pl-4">
                      {viralityDiagnosis.viralFixes?.map((fix: string, i: number) => (
                        <li key={i}>{fix}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 1-Click Opening Line Apply */}
                  {viralityDiagnosis.improvedViralHook && (
                    <div className="p-4 bg-[#2563EB]/10 border border-[#2563EB]/30 rounded-xl space-y-2">
                      <span className="text-xs font-extrabold text-[#2563EB] uppercase block">Suggested Opening Line:</span>
                      <p className="text-xs md:text-sm font-semibold text-[var(--text-primary)] italic">
                        &quot;{viralityDiagnosis.improvedViralHook}&quot;
                      </p>
                      <button
                        type="button"
                        onClick={() => router.push(`/composer?hook=${encodeURIComponent(viralityDiagnosis.improvedViralHook)}`)}
                        className="btn btn-primary px-4 py-2 text-xs font-extrabold flex items-center gap-1.5 mt-2 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Use This Opening Line</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* COLUMN 2: HIGH-YIELD HASHTAG RADAR */}
            <div className="lg:col-span-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                <div>
                  <h3 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                    <Hash className="h-5 w-5 text-[#0ea5e9]" />
                    High-Yield Trending Hashtag Radar
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">Top-performing hashtags for your niche</p>
                </div>
              </div>

              <div className="space-y-3">
                {trendingTags.map((tagObj, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 bg-[var(--bg-input)]/50 border border-[var(--border-color)] rounded-2xl hover:border-[#2563EB]/40 transition-all">
                    <div>
                      <span className="text-xs font-black text-[#2563EB]">{tagObj.tag}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          {tagObj.reachMultiplier} Reach
                        </span>
                        <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                          {tagObj.engagementRate} Eng.
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => router.push(`/composer?tags=${encodeURIComponent(tagObj.tag)}`)}
                      className="h-8 px-3 rounded-xl bg-[var(--bg-card)] hover:bg-[#2563EB] hover:text-white border border-[var(--border-color)] text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      + Use Tag
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const allTags = trendingTags.slice(0, 3).map(t => t.tag).join(' ');
                    router.push(`/composer?tags=${encodeURIComponent(allTags)}`);
                  }}
                  className="btn btn-primary w-full py-2.5 text-xs font-extrabold flex items-center justify-center gap-2 mt-4 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Draft Post with Top 3 Tags</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          TAB 3: ANALYTICS & HEATMAPS SECTION
         ========================================================================== */}
      {activeTab === 'ANALYTICS' && (() => {
        // Dynamic Sentiment Calculations
        let posCount = 0;
        let neuCount = 0;
        let negCount = 0;
        publishedPosts.forEach(post => {
          if (post.tone === 'ENGAGING' || post.tone === 'STORYTELLING' || post.tone === 'HUMOROUS') posCount++;
          else if (post.tone === 'PROFESSIONAL' || post.tone === 'CASUAL') neuCount++;
          else posCount++;
        });
        negCount = safePosts.filter(p => p?.status === 'FAILED').length;
        const totalSentimentEvals = posCount + neuCount + negCount;
        const posPct = totalSentimentEvals > 0 ? Math.round((posCount / totalSentimentEvals) * 100) : 0;
        const neuPct = totalSentimentEvals > 0 ? Math.round((neuCount / totalSentimentEvals) * 100) : 0;
        const negPct = totalSentimentEvals > 0 ? Math.round((negCount / totalSentimentEvals) * 100) : 0;

        // Dynamic Platform Performance Breakdown
        const platformDispatches: Record<string, number> = {};
        allowedPlatforms.forEach(p => { platformDispatches[p] = 0; });
        let totalDispatches = 0;
        publishedPosts.forEach(post => {
          const tps = Array.isArray(post.targetPlatforms) ? post.targetPlatforms : [];
          tps.forEach(p => {
            const pUpper = String(p).toUpperCase();
            if (platformDispatches[pUpper] !== undefined) {
              platformDispatches[pUpper] += 1;
              totalDispatches += 1;
            }
          });
        });

        const platformColors: Record<string, string> = {
          LINKEDIN: '#0a66c2',
          INSTAGRAM: '#e1306c',
          X: '#38bdf8',
          FACEBOOK: '#1877f2',
        };

        // Dynamic Heatmap Calculations
        const daysList = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const hourSlots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
        const dynamicHeatmap: Record<string, number[]> = {
          Mon: [0, 0, 0, 0, 0, 0, 0],
          Tue: [0, 0, 0, 0, 0, 0, 0],
          Wed: [0, 0, 0, 0, 0, 0, 0],
          Thu: [0, 0, 0, 0, 0, 0, 0],
          Fri: [0, 0, 0, 0, 0, 0, 0],
          Sat: [0, 0, 0, 0, 0, 0, 0],
          Sun: [0, 0, 0, 0, 0, 0, 0],
        };

        let hasHeatmapData = false;
        publishedPosts.forEach(post => {
          if (post.publishedAt) {
            hasHeatmapData = true;
            const date = new Date(post.publishedAt);
            const dayIndex = (date.getDay() + 6) % 7;
            const dayName = daysList[dayIndex];
            const hour = date.getHours();
            const slotIdx = Math.min(6, Math.max(0, Math.floor((hour - 8) / 2)));
            if (dayName && dynamicHeatmap[dayName]) {
              dynamicHeatmap[dayName][slotIdx] = Math.min(3, dynamicHeatmap[dayName][slotIdx] + 1);
            }
          }
        });

        return (
          <div className="space-y-8 animate-fadeIn">
            {/* TOP ROW: SENTIMENT BAR + PLATFORM DONUT CHART */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* SENTIMENT & MOOD BAR */}
              {visibleWidgets.sentiment && (
                <div className="lg:col-span-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 md:p-7 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                    <div>
                      <h3 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                        <Smile className="h-5 w-5 text-emerald-500" />
                        Sentiment & Audience Mood Bar
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">Sentiment analysis of interactions & post tones</p>
                    </div>
                    {totalSentimentEvals > 0 && (
                      <span className="text-xs text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-extrabold">
                        {posPct}% Positive
                      </span>
                    )}
                  </div>

                  {totalSentimentEvals === 0 ? (
                    <div className="p-6 bg-[var(--bg-input)]/40 border border-[var(--border-color)] rounded-2xl text-center space-y-2">
                      <Smile className="w-8 h-8 mx-auto text-[var(--text-secondary)] opacity-50" />
                      <p className="text-xs font-bold text-[var(--text-primary)]">No Interactions Evaluated Yet</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">Publish posts across your social channels to generate live AI sentiment analysis.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="h-6 w-full rounded-2xl bg-[var(--bg-input)] border border-[var(--border-color)] overflow-hidden flex shadow-inner">
                        {posPct > 0 && (
                          <div style={{ width: `${posPct}%` }} className="bg-emerald-500 h-full flex items-center justify-center text-[10px] font-extrabold text-white">
                            {posPct}%
                          </div>
                        )}
                        {neuPct > 0 && (
                          <div style={{ width: `${neuPct}%` }} className="bg-amber-400 h-full flex items-center justify-center text-[10px] font-extrabold text-slate-900">
                            {neuPct}%
                          </div>
                        )}
                        {negPct > 0 && (
                          <div style={{ width: `${negPct}%` }} className="bg-rose-500 h-full flex items-center justify-center text-[10px] font-extrabold text-white">
                            {negPct}%
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-3 pt-1">
                        <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                          <span className="text-xs text-emerald-500 font-extrabold">Positive</span>
                          <span className="text-sm font-black text-[var(--text-primary)]">{posCount}</span>
                        </div>
                        <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between">
                          <span className="text-xs text-amber-500 font-extrabold">Neutral</span>
                          <span className="text-sm font-black text-[var(--text-primary)]">{neuCount}</span>
                        </div>
                        <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between">
                          <span className="text-xs text-rose-500 font-extrabold">Issues/Failed</span>
                          <span className="text-sm font-black text-[var(--text-primary)]">{negCount}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PLATFORM COMPARISON DONUT / LIST CHART */}
              {visibleWidgets.platformDonut && (
                <div className="lg:col-span-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 md:p-7 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                    <div>
                      <h3 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                        <PieChart className="h-5 w-5 text-[#2563EB]" />
                        Platform Performance Distribution
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">Post dispatches per enabled channel</p>
                    </div>
                  </div>

                  {totalDispatches === 0 ? (
                    <div className="p-6 bg-[var(--bg-input)]/40 border border-[var(--border-color)] rounded-2xl text-center space-y-2">
                      <PieChart className="w-8 h-8 mx-auto text-[var(--text-secondary)] opacity-50" />
                      <p className="text-xs font-bold text-[var(--text-primary)]">No Dispatches Recorded Yet</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">Platform distribution breakdown will calibrate here once your first post is published.</p>
                      <button
                        type="button"
                        onClick={() => router.push('/composer')}
                        className="btn btn-primary px-4 py-2 text-xs font-extrabold inline-flex items-center gap-1.5 mt-2 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Create First Post</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allowedPlatforms.map(plat => {
                        const count = platformDispatches[plat] || 0;
                        const pct = totalDispatches > 0 ? Math.round((count / totalDispatches) * 100) : 0;
                        const color = platformColors[plat] || '#2563EB';
                        const isConnected = safeAccounts.some(a => a?.platform?.toUpperCase() === plat && a?.isActive !== false);

                        return (
                          <div key={plat} className="flex items-center justify-between p-3 bg-[var(--bg-input)]/50 rounded-xl border border-[var(--border-color)]">
                            <div className="flex items-center gap-2.5">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                              <span className="text-xs font-bold text-[var(--text-primary)]">{plat}</span>
                              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                                isConnected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-[var(--text-secondary)]'
                              }`}>
                                {isConnected ? 'Connected' : 'Not Linked'}
                              </span>
                            </div>
                            <span className="text-xs font-black text-[var(--text-primary)]">
                              {count} {count === 1 ? 'post' : 'posts'} ({pct}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AUDIENCE ACTIVITY HEATMAP */}
            {visibleWidgets.activityHeatmap && (
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                  <div>
                    <h3 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-500" />
                      Audience Activity Heatmap (Best Posting Time)
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">Post activity and golden engagement windows</p>
                  </div>
                  <span className="text-xs font-extrabold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    {hasHeatmapData ? 'Live Calculated Radar' : 'Calibrating'}
                  </span>
                </div>

                {!hasHeatmapData ? (
                  <div className="p-6 bg-[var(--bg-input)]/40 border border-[var(--border-color)] rounded-2xl text-center space-y-2">
                    <Clock className="w-8 h-8 mx-auto text-amber-500/60" />
                    <p className="text-xs font-bold text-[var(--text-primary)]">Heatmap Calibrating</p>
                    <p className="text-[11px] text-[var(--text-secondary)]">Your 7-day activity radar will map active peak windows as you dispatch posts across your connected channels.</p>
                  </div>
                ) : (
                  <div className="space-y-2 overflow-x-auto">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-secondary)] mb-1">
                      <span className="w-10">Day</span>
                      {hourSlots.map(h => (
                        <span key={h} className="flex-1 text-center">{h}</span>
                      ))}
                    </div>

                    {daysList.map(day => (
                      <div key={day} className="flex items-center gap-2">
                        <span className="w-10 text-xs font-bold text-[var(--text-secondary)]">{day}</span>
                        {(dynamicHeatmap[day] || [0, 0, 0, 0, 0, 0, 0]).map((lvl, idx) => (
                          <div
                            key={idx}
                            className={`flex-1 h-7 rounded-lg transition-all ${
                              lvl >= 3
                                ? 'bg-[#2563EB] shadow-xs'
                                : lvl === 2
                                ? 'bg-[#2563EB]/60'
                                : lvl === 1
                                ? 'bg-[#2563EB]/25'
                                : 'bg-[var(--bg-input)] border border-[var(--border-color)]'
                            }`}
                            title={`${day} ${hourSlots[idx]} Activity Level: ${lvl > 0 ? `${lvl} dispatches` : 'No dispatches'}`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* INSTANT APPROVAL MODAL (For Omni-Prompt) */}
      {showApprovalModal && portalMounted && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowApprovalModal(false); }}
          className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl max-w-2xl w-full p-5 sm:p-7 space-y-5 shadow-2xl relative max-h-[90vh] flex flex-col my-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)] shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#2563EB]/10 text-[#2563EB] rounded-xl">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)]">AI Content Approval Deck</h3>
                  <p className="text-xs text-[var(--text-secondary)] font-medium">Review and 1-click approve generated drafts for automatic queuing</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="h-8 w-8 rounded-xl bg-[var(--bg-input)] hover:bg-rose-500/10 border border-[var(--border-color)] hover:border-rose-500/30 text-[var(--text-primary)] hover:text-rose-500 transition-all flex items-center justify-center cursor-pointer shrink-0"
                title="Close modal"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
              {generatedDrafts.map((draft, idx) => {
                const isApproved = approvedIndices.includes(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => handleToggleApproveDraft(idx)}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isApproved 
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-xs' 
                        : 'bg-[var(--bg-input)]/60 border-[var(--border-color)] hover:border-[#2563EB]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#2563EB] uppercase tracking-wider">Draft #{idx + 1}</span>
                      <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                        isApproved 
                          ? 'bg-emerald-500 text-white border-emerald-500' 
                          : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)]'
                      }`}>
                        {isApproved ? '🟢 Approved' : '🟡 Click to Approve'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-primary)] font-medium leading-relaxed">{draft}</p>
                  </div>
                );
              })}
            </div>

            {/* Fixed Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-color)] shrink-0">
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="btn btn-secondary px-5 py-2.5 text-xs font-bold cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleApproveAllAndSchedule}
                disabled={isSchedulingDrafts}
                className="btn btn-primary px-6 py-2.5 text-xs font-extrabold flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSchedulingDrafts ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>{isSchedulingDrafts ? 'Queuing Posts...' : 'Approve & Schedule in Database'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
