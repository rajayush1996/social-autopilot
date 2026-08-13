'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
  Grid
} from 'lucide-react';
import { Post, SocialAccount, User } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

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

  // WIDGET 1: Omni-Prompt State
  const [omniPrompt, setOmniPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [generatedDrafts, setGeneratedDrafts] = useState<string[]>([]);
  const [approvedIndices, setApprovedIndices] = useState<number[]>([]);

  // WIDGET 4: Actionable Advice State
  const [appliedTimeAdvice, setAppliedTimeAdvice] = useState(false);
  const [appliedTrendAdvice, setAppliedTrendAdvice] = useState(false);

  // WIDGET GRID TOGGLE & CUSTOMIZATION STATE
  const [activeTab, setActiveTab] = useState<'CORE' | 'ANALYTICS' | 'CUSTOM'>('CORE');
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
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

  // Omni-Prompt Quick Suggestions
  const promptSuggestions = [
    '🚀 3 Tweets for AI Startup Launch',
    '💡 Weekly Product Feature Spotlight',
    '📈 Viral Growth Hacks Thread for LinkedIn',
    '🎯 High-Engagement Poll for Instagram Stories'
  ];

  const handleRunOmniPrompt = (promptText?: string) => {
    const textToRun = promptText || omniPrompt;
    if (!textToRun.trim()) {
      toast.error('Please enter an AI prompt or select a quick suggestion!');
      return;
    }

    setIsGenerating(true);
    setOmniPrompt(textToRun);

    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedDrafts([
        `🚀 Exciting news! Today we officially launch our autonomous social autopilot engine. Say goodbye to manual scheduling! #StartupLaunch #AIPowered`,
        `💡 How we built 10x organic growth: 1. Compaction memory 2. Multi-channel AI sync 3. Zero-delay dispatching. Simple & scalable!`,
        `🎯 Question for founders: How many hours do you spend scheduling social posts every week? Comment below! 👇`
      ]);
      setApprovedIndices([]);
      setShowApprovalModal(true);
      toast.success('AI Content generated! Approval pop-up ready.');
    }, 900);
  };

  const handleToggleApproveDraft = (index: number) => {
    if (approvedIndices.includes(index)) {
      setApprovedIndices(approvedIndices.filter(i => i !== index));
    } else {
      setApprovedIndices([...approvedIndices, index]);
    }
  };

  const handleApproveAllAndSchedule = () => {
    toast.success('Approved drafts queued for autonomous scheduling!');
    setShowApprovalModal(false);
    setOmniPrompt('');
    if (onRefreshData) onRefreshData();
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ==========================================================================
          DASHBOARD VIEW MODE SWITCHER & WIDGET CUSTOMIZER TOOLBAR
         ========================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-xs">
        {/* Tab Selection */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('CORE')}
            className={`h-9 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
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
            onClick={() => setActiveTab('ANALYTICS')}
            className={`h-9 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'ANALYTICS'
                ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Analytics & Performance</span>
          </button>
        </div>

        {/* Customize Widgets Action */}
        <button
          type="button"
          onClick={() => setShowCustomizeModal(true)}
          className="h-9 px-4 rounded-xl bg-[var(--bg-input)] hover:bg-[#2563EB]/10 border border-[var(--border-color)] hover:border-[#2563EB]/30 text-[var(--text-primary)] hover:text-[#2563EB] text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
        >
          <Sliders className="h-4 w-4" />
          <span>Customize Layout</span>
        </button>
      </div>

      {/* CUSTOMIZE WIDGETS MODAL */}
      {showCustomizeModal && (
        <div className="fixed inset-0 w-screen h-screen min-h-screen z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn top-0 left-0 right-0 bottom-0">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl max-w-lg w-full p-6 md:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#2563EB]/10 text-[#2563EB] rounded-xl">
                  <Grid className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[var(--text-primary)]">Widget Library & Grid Control</h3>
                  <p className="text-xs text-[var(--text-secondary)] font-medium">Toggle graphs and monitoring widgets on your custom view</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomizeModal(false)}
                className="h-8 w-8 rounded-xl bg-[var(--bg-input)] hover:bg-rose-500/10 border border-[var(--border-color)] hover:border-rose-500/30 text-[var(--text-primary)] hover:text-rose-500 transition-all flex items-center justify-center cursor-pointer"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
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
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isChecked 
                        ? 'bg-[#2563EB]/10 border-[#2563EB]/40 shadow-xs' 
                        : 'bg-[var(--bg-input)]/50 border-[var(--border-color)] opacity-70'
                    }`}
                  >
                    <div>
                      <h4 className="text-sm font-extrabold text-[var(--text-primary)]">{w.title}</h4>
                      <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">{w.desc}</p>
                    </div>
                    <span className={`h-6 w-11 rounded-full p-1 transition-colors ${isChecked ? 'bg-[#2563EB]' : 'bg-slate-700'}`}>
                      <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${isChecked ? 'translate-x-5' : 'translate-x-0'}`} />
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-[var(--border-color)] text-right">
              <button
                type="button"
                onClick={() => {
                  setShowCustomizeModal(false);
                  setActiveTab('ANALYTICS');
                  toast.success('Widget layout preferences saved!');
                }}
                className="btn btn-primary px-6 py-2.5 text-xs font-extrabold"
              >
                Apply Custom Grid Layout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          WIDGET 1: THE "OMNI-PROMPT" COMMAND BAR (Top Full-Width Widget)
         ========================================================================== */}
      <div className="bg-[var(--bg-card)] border-2 border-[#2563EB]/30 rounded-3xl p-6 md:p-8 shadow-lg relative overflow-hidden backdrop-blur-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#2563EB] text-white rounded-xl shadow-md shadow-blue-500/20">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-[var(--text-primary)]">Omni-Prompt AI Command Bar</h2>
              <p className="text-xs text-[var(--text-secondary)] font-medium">Type any content command or campaign instruction for instant multi-channel generation</p>
            </div>
          </div>
        </div>

        {/* Command Search Input Bar */}
        <div className="relative mt-4">
          <input
            type="text"
            value={omniPrompt}
            onChange={(e) => setOmniPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRunOmniPrompt()}
            placeholder="e.g. Make 3 tweets about a new AI startup launch and schedule for tomorrow..."
            disabled={isGenerating}
            className="w-full h-14 pl-5 pr-44 bg-[var(--bg-card)] border-2 border-[#2563EB]/40 focus:border-[#2563EB] rounded-2xl text-sm md:text-base text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none shadow-md transition-colors"
          />
          <button
            type="button"
            onClick={() => handleRunOmniPrompt()}
            disabled={isGenerating}
            className="absolute right-2 top-2 bottom-2 h-10 px-6 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-xs md:text-sm font-extrabold shadow-md shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span>Generate & Approve</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Suggestion Pills - Horizontally Scrollable Single Row */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto custom-scrollbar whitespace-nowrap pb-1">
          <span className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider shrink-0 mr-1">Quick Prompts:</span>
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

      {/* Instant Approval Pop-Up Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 w-screen h-screen min-h-screen z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn top-0 left-0 right-0 bottom-0">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#2563EB]/10 text-[#2563EB] rounded-xl">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[var(--text-primary)]">AI Content Approval Deck</h3>
                  <p className="text-xs text-[var(--text-secondary)] font-medium">Review and 1-click approve generated drafts for automatic queuing</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="h-8 w-8 rounded-xl bg-[var(--bg-input)] hover:bg-rose-500/10 border border-[var(--border-color)] hover:border-rose-500/30 text-[var(--text-primary)] hover:text-rose-500 transition-all flex items-center justify-center cursor-pointer"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {generatedDrafts.map((draft, idx) => {
                const isApproved = approvedIndices.includes(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => handleToggleApproveDraft(idx)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isApproved 
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-xs' 
                        : 'bg-[var(--bg-input)] border-[var(--border-color)] hover:border-[#2563EB]/40'
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
                    <p className="text-sm text-[var(--text-primary)] font-medium leading-relaxed">{draft}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="btn btn-secondary px-5 py-2.5 text-xs font-bold"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleApproveAllAndSchedule}
                className="btn btn-primary px-6 py-2.5 text-xs font-extrabold flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                <span>Approve All & Schedule Queue</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          WIDGET 2: AUTOMATION PULSE (The "ROI" Widget)
         ========================================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-500" />
              Automation Pulse & ROI Savings
            </h2>
            <p className="text-xs text-[var(--text-secondary)] font-medium">Overview of automated actions handled by AI</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm hover:border-[#2563EB]/40 transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">DMs Handled</span>
              <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
                <Send className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-[var(--text-primary)]">42 DMs</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-color)]">
              <span className="text-xs text-[var(--text-secondary)] font-semibold">Auto-Replies Sent Today</span>
              <span className="text-xs text-emerald-500 font-bold">100% Success</span>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm hover:border-emerald-500/40 transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">Comments Moderated</span>
              <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-[var(--text-primary)]">128 Filtered</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-color)]">
              <span className="text-xs text-[var(--text-secondary)] font-semibold">Spam Deleted & Replied</span>
              <span className="text-xs text-emerald-500 font-bold">Safe & Clean</span>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm hover:border-indigo-500/40 transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">Human Hours Saved</span>
              <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-[var(--text-primary)]">14.5 Hours</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-color)]">
              <span className="text-xs text-[var(--text-secondary)] font-semibold">Estimated Cost Savings</span>
              <span className="text-xs text-indigo-500 font-black">$435 Equivalent</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================================================
          NEW MONITORING WIDGET SECTION (Shown in ANALYTICS or CUSTOM mode)
         ========================================================================== */}
      {(activeTab === 'ANALYTICS' || activeTab === 'CUSTOM') && (
        <div className="space-y-8 animate-fadeIn">
          {/* TOP ROW: SENTIMENT BAR + PLATFORM DONUT CHART */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* WIDGET 6: SENTIMENT & MOOD BAR */}
            {visibleWidgets.sentiment && (
              <div className="lg:col-span-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 md:p-7 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                  <div>
                    <h3 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                      <Smile className="h-5 w-5 text-emerald-500" />
                      Sentiment & Audience Mood Bar
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">Sentiment analysis of recent interactions</p>
                  </div>
                  <span className="text-xs text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-extrabold">
                    82% Positive
                  </span>
                </div>

                {/* Stacked Sentiment Percentage Bar */}
                <div className="space-y-3">
                  <div className="h-6 w-full rounded-2xl bg-[var(--bg-input)] border border-[var(--border-color)] overflow-hidden flex shadow-inner">
                    <div style={{ width: '82%' }} className="bg-emerald-500 h-full flex items-center justify-center text-[10px] font-extrabold text-white">82%</div>
                    <div style={{ width: '12%' }} className="bg-amber-400 h-full flex items-center justify-center text-[10px] font-extrabold text-slate-900">12%</div>
                    <div style={{ width: '6%' }} className="bg-rose-500 h-full flex items-center justify-center text-[10px] font-extrabold text-white">6%</div>
                  </div>

                  {/* Compact Single Inline Row */}
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                      <span className="text-xs text-emerald-500 font-extrabold">Positive</span>
                      <span className="text-sm font-black text-[var(--text-primary)]">1,420</span>
                    </div>
                    <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between">
                      <span className="text-xs text-amber-500 font-extrabold">Neutral</span>
                      <span className="text-sm font-black text-[var(--text-primary)]">208</span>
                    </div>
                    <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between">
                      <span className="text-xs text-rose-500 font-extrabold">Negative</span>
                      <span className="text-sm font-black text-[var(--text-primary)]">104</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* WIDGET 7: PLATFORM COMPARISON DONUT CHART */}
            {visibleWidgets.platformDonut && (
              <div className="lg:col-span-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 md:p-7 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                  <div>
                    <h3 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-[#2563EB]" />
                      Platform Performance Distribution
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">Reach & engagement contribution per connected channel</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  {/* Donut SVG */}
                  <div className="w-36 h-36 relative shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path strokeDasharray="45, 100" stroke="#0a66c2" strokeWidth="4" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path strokeDasharray="35, 100" strokeDashoffset="-45" stroke="#e1306c" strokeWidth="4" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path strokeDasharray="20, 100" strokeDashoffset="-80" stroke="#38bdf8" strokeWidth="4" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-xs text-[var(--text-secondary)] font-bold">Top</span>
                      <span className="text-sm font-black text-[var(--text-primary)]">LinkedIn</span>
                    </div>
                  </div>

                  {/* Platform Legend */}
                  <div className="space-y-3 flex-1 w-full">
                    <div className="flex items-center justify-between p-2.5 bg-[var(--bg-input)]/50 rounded-xl border border-[var(--border-color)]">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#0a66c2]" />
                        <span className="text-xs font-bold text-[var(--text-primary)]">LinkedIn</span>
                      </div>
                      <span className="text-xs font-black text-[#0a66c2]">45% (64.2K Reach)</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-[var(--bg-input)]/50 rounded-xl border border-[var(--border-color)]">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#e1306c]" />
                        <span className="text-xs font-bold text-[var(--text-primary)]">Instagram</span>
                      </div>
                      <span className="text-xs font-black text-[#e1306c]">35% (49.9K Reach)</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-[var(--bg-input)]/50 rounded-xl border border-[var(--border-color)]">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#38bdf8]" />
                        <span className="text-xs font-bold text-[var(--text-primary)]">X (Twitter)</span>
                      </div>
                      <span className="text-xs font-black text-[#38bdf8]">20% (28.5K Reach)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* MIDDLE ROW: AUDIENCE HEATMAP + FORMAT BREAKDOWN */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* WIDGET 8: AUDIENCE ACTIVITY HEATMAP */}
            {visibleWidgets.activityHeatmap && (
              <div className="lg:col-span-7 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 md:p-7 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                  <div>
                    <h3 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-500" />
                      Audience Activity Heatmap (Best Posting Time)
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">Follower activity heat map by time and day</p>
                  </div>
                  <span className="text-xs font-extrabold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    Peak: 10:00 AM & 4:00 PM
                  </span>
                </div>

                {/* Heatmap Grid */}
                <div className="space-y-2 overflow-x-auto">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-secondary)] mb-1">
                    <span className="w-10">Day</span>
                    {['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'].map(h => (
                      <span key={h} className="flex-1 text-center">{h}</span>
                    ))}
                  </div>

                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="flex items-center gap-2">
                      <span className="w-10 text-xs font-bold text-[var(--text-secondary)]">{day}</span>
                      {[1, 3, 2, 1, 3, 2, 1].map((lvl, idx) => (
                        <div
                          key={idx}
                          className={`flex-1 h-7 rounded-lg transition-all ${
                            lvl === 3
                              ? 'bg-[#2563EB] shadow-xs'
                              : lvl === 2
                              ? 'bg-[#2563EB]/40'
                              : 'bg-[var(--bg-input)] border border-[var(--border-color)]'
                          }`}
                          title={`${day} activity level: ${lvl === 3 ? 'PEAK' : lvl === 2 ? 'MEDIUM' : 'NORMAL'}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* WIDGET 9: CONTENT FORMAT BREAKDOWN */}
            {visibleWidgets.formatBreakdown && (
              <div className="lg:col-span-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 md:p-7 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                  <div>
                    <h3 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-indigo-500" />
                      Content Format Breakdown
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">Average engagement rate per post format</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-[var(--text-primary)] mb-1.5">
                      <span>🎥 Video Reels</span>
                      <span className="text-emerald-500 font-extrabold">7.4% Avg Eng (3.2x Saves)</span>
                    </div>
                    <div className="h-3 w-full bg-[var(--bg-input)] rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-[var(--text-primary)] mb-1.5">
                      <span>📸 Photo Carousels</span>
                      <span className="text-indigo-500 font-extrabold">5.8% Avg Eng</span>
                    </div>
                    <div className="h-3 w-full bg-[var(--bg-input)] rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: '68%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-[var(--text-primary)] mb-1.5">
                      <span>🖼️ Single Images</span>
                      <span className="text-[var(--text-secondary)] font-extrabold">3.2% Avg Eng</span>
                    </div>
                    <div className="h-3 w-full bg-[var(--bg-input)] rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: '40%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-[var(--text-primary)] mb-1.5">
                      <span>✍️ Text Threads</span>
                      <span className="text-[var(--text-secondary)] font-extrabold">2.9% Avg Eng</span>
                    </div>
                    <div className="h-3 w-full bg-[var(--bg-input)] rounded-full overflow-hidden">
                      <div className="h-full bg-slate-500 rounded-full" style={{ width: '32%' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM ROW: WIDGET 10 (CONVERSION & LEAD FUNNEL CHART) */}
          {visibleWidgets.leadFunnel && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                <div>
                  <h3 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                    <Filter className="h-5 w-5 text-[#2563EB]" />
                    Conversion & Lead Funnel Chart
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">End-to-end revenue & lead capture journey driven by social automation</p>
                </div>
                <span className="text-xs font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  💰 $4,800 Generated Revenue
                </span>
              </div>

              {/* Funnel Graph */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-5 bg-[var(--bg-input)]/50 border border-[var(--border-color)] rounded-2xl space-y-2 text-center">
                  <Eye className="h-6 w-6 text-blue-500 mx-auto" />
                  <span className="text-xs text-[var(--text-secondary)] font-bold block uppercase">1. Total Reach</span>
                  <p className="text-2xl font-black text-[var(--text-primary)]">142.8K</p>
                  <span className="text-[10px] text-[var(--text-secondary)] font-semibold">Post Impressions</span>
                </div>

                <div className="p-5 bg-blue-500/10 border border-blue-500/30 rounded-2xl space-y-2 text-center">
                  <MessageSquare className="h-6 w-6 text-blue-600 mx-auto" />
                  <span className="text-xs text-[#2563EB] font-bold block uppercase">2. DM / Comments</span>
                  <p className="text-2xl font-black text-[var(--text-primary)]">2,410</p>
                  <span className="text-[10px] text-[#2563EB] font-bold">1.69% Engagement</span>
                </div>

                <div className="p-5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl space-y-2 text-center">
                  <UserCheck className="h-6 w-6 text-indigo-500 mx-auto" />
                  <span className="text-xs text-indigo-500 font-bold block uppercase">3. Leads Captured</span>
                  <p className="text-2xl font-black text-[var(--text-primary)]">480</p>
                  <span className="text-[10px] text-indigo-500 font-bold">Links Sent via Auto-DM</span>
                </div>

                <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2 text-center">
                  <DollarSign className="h-6 w-6 text-emerald-500 mx-auto" />
                  <span className="text-xs text-emerald-500 font-bold block uppercase">4. Sales & Revenue</span>
                  <p className="text-2xl font-black text-[var(--text-primary)]">96 Sales</p>
                  <span className="text-[10px] text-emerald-500 font-black">$4,800 Converted</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==========================================================================
          MIDDLE ROW: WIDGET 3 (Content Pipeline) + WIDGET 4 (Smart AI Insights)
         ========================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* WIDGET 3: THE CONTENT PIPELINE (Upcoming Queue) */}
        <div className="lg:col-span-7 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 md:p-7 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
            <div>
              <h3 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#2563EB]" />
                The Content Pipeline (Upcoming Queue)
              </h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">Visual timeline of scheduled posts and AI generated drafts awaiting approval</p>
            </div>
            <Link
              href="/posts"
              className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline flex items-center gap-1"
            >
              View Full Queue <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Timeline List */}
          <div className="space-y-4">
            {/* Timeline Item 1 - Green: Ready */}
            <div className="p-4 bg-[var(--bg-input)]/50 border border-[var(--border-color)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#2563EB]/40 transition-all">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-[#0a66c2]/10 text-[#0a66c2] rounded-xl shrink-0">
                  <LinkedInIcon className="w-5 h-5 text-[#0a66c2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      🟢 Ready to Publish
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] font-semibold">Today, 4:00 PM</span>
                  </div>
                  <p className="text-sm font-bold text-[var(--text-primary)] mt-1 line-clamp-1">
                    💡 How our team automated 80% of multi-channel social media publishing...
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Link 
                  href="/posts" 
                  className="h-9 min-w-[120px] px-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] hover:bg-[#2563EB]/10 hover:border-[#2563EB]/30 text-[var(--text-primary)] hover:text-[#2563EB] text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Post</span>
                </Link>
              </div>
            </div>

            {/* Timeline Item 2 - Yellow: Needs Approval */}
            <div className="p-4 bg-amber-500/5 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-slate-900 text-white rounded-xl shrink-0 border border-slate-700">
                  <XIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                      🟡 Needs Approval
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] font-semibold">Tomorrow, 10:00 AM</span>
                  </div>
                  <p className="text-sm font-bold text-[var(--text-primary)] mt-1 line-clamp-1">
                    Stop overthinking your content strategy. Consistency & compaction win every time. 🚀
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => toast.success('Post draft approved for automated dispatch!')}
                  className="h-9 min-w-[120px] px-4 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Approve</span>
                </button>
              </div>
            </div>

            {/* Timeline Item 3 - Red: API Issue */}
            <div className="p-4 bg-rose-500/5 border border-rose-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-[#e1306c]/10 text-[#e1306c] rounded-xl shrink-0">
                  <InstagramIcon className="w-5 h-5 text-[#e1306c]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-rose-500 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                      🔴 Failed (Token Expired)
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] font-semibold">2 hours ago</span>
                  </div>
                  <p className="text-sm font-bold text-[var(--text-primary)] mt-1 line-clamp-1">
                    Behind the scenes of building an AI Social Autopilot pipeline...
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Link 
                  href="/accounts" 
                  className="h-9 min-w-[120px] px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Reconnect</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* WIDGET 4: SMART AI INSIGHTS (Actionable Advice Widget) */}
        <div className="lg:col-span-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 md:p-7 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
              <div>
                <h3 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-500" />
                  Smart AI Insights
                </h3>
                <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">AI recommendations based on recent performance</p>
              </div>
            </div>

            {/* Insight 1: Engagement Timing Advice */}
            <div className="p-5 bg-[#2563EB]/5 border border-[#2563EB]/25 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#2563EB]">
                <Clock className="h-4 w-4" />
                <span>Peak Engagement Pattern Detected</span>
              </div>
              <p className="text-sm text-[var(--text-primary)] font-medium leading-relaxed">
                &quot;Your last 2 Reels achieved 3.4x higher engagement at 10:00 AM EST. Should I auto-schedule upcoming Reels for this daily peak time?&quot;
              </p>
              <button
                type="button"
                onClick={() => {
                  setAppliedTimeAdvice(true);
                  toast.success('Auto-schedule time locked for 10:00 AM daily peak!');
                }}
                disabled={appliedTimeAdvice}
                className="btn btn-primary w-full py-2.5 text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                {appliedTimeAdvice ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-white" />
                    <span>Applied to 10:00 AM Peak</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    <span>⚡ Apply Auto-Schedule (10:00 AM)</span>
                  </>
                )}
              </button>
            </div>

            {/* Insight 2: Trending Topic Prompt */}
            <div className="p-5 bg-[#2563EB]/5 border border-[#2563EB]/25 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#2563EB]">
                <TrendingUp className="h-4 w-4" />
                <span>Real-Time Viral Trend Match</span>
              </div>
              <p className="text-sm text-[var(--text-primary)] font-medium leading-relaxed">
                &quot;The topic &apos;#TechStartup&apos; is currently trending on X (Twitter). Would you like to generate a quick high-engagement draft thread?&quot;
              </p>
              <button
                type="button"
                onClick={() => {
                  setAppliedTrendAdvice(true);
                  handleRunOmniPrompt('Generate a viral tweet thread about Tech Startup growth hacks');
                }}
                disabled={appliedTrendAdvice}
                className="btn btn-primary w-full py-2.5 text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                <Sparkles className="h-4 w-4" />
                <span>✨ Generate Trend Draft</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================================================
          WIDGET 5: QUICK VITALS (Mini-Sparkline Charts Widget)
         ========================================================================== */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
          <div>
            <h3 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Quick Vitals & Profile Health
            </h3>
            <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">Overview of key growth metrics across all channels</p>
          </div>
          <span className="text-xs text-emerald-500 font-extrabold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            📈 +18.4% Overall Growth
          </span>
        </div>

        {/* 3 Sparkline Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[var(--bg-input)]/40 border border-[var(--border-color)] rounded-2xl p-5 space-y-3">
            <span className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider block">Total Cross-Platform Reach</span>
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-black text-[var(--text-primary)]">142.8K</p>
              <span className="text-xs font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">+18.4%</span>
            </div>
            <div className="w-full h-10 relative pt-2">
              <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
                <path d="M 0 30 Q 40 10, 80 25 T 160 5 T 200 15" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="bg-[var(--bg-input)]/40 border border-[var(--border-color)] rounded-2xl p-5 space-y-3">
            <span className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider block">New Followers Gained</span>
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-black text-[var(--text-primary)]">1,240</p>
              <span className="text-xs font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">+12.1%</span>
            </div>
            <div className="w-full h-10 relative pt-2">
              <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
                <path d="M 0 35 Q 50 20, 100 28 T 170 8 T 200 12" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="bg-[var(--bg-input)]/40 border border-[var(--border-color)] rounded-2xl p-5 space-y-3">
            <span className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider block">Avg Engagement Rate</span>
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-black text-[var(--text-primary)]">4.8%</p>
              <span className="text-xs font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">+0.6%</span>
            </div>
            <div className="w-full h-10 relative pt-2">
              <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
                <path d="M 0 25 Q 60 30, 110 15 T 160 20 T 200 5" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
