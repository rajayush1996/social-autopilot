'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  MessageSquare, 
  ThumbsUp, 
  Zap, 
  ShieldCheck, 
  Save, 
  CheckCircle2, 
  Clock, 
  Layers, 
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Link2,
  Lock
} from 'lucide-react';
import ApiService from '@/services/apiService';
import { SocialAccount } from '@/lib/api';

export type AllowedPlatform = 'LINKEDIN' | 'X' | 'INSTAGRAM' | 'FACEBOOK';

interface PlatformEngagementRule {
  autoLike: boolean;
  autoComment: boolean;
  commentDelaySeconds: number;
  firstCommentTemplate: string;
  commentStrategy?: 'AI_SMART' | 'CUSTOM_TEMPLATE';
}

interface EngagementSettings {
  LINKEDIN: PlatformEngagementRule;
  X: PlatformEngagementRule;
  INSTAGRAM: PlatformEngagementRule;
  FACEBOOK: PlatformEngagementRule;
}

const DEFAULT_SETTINGS: EngagementSettings = {
  LINKEDIN: {
    autoLike: true,
    autoComment: true,
    commentDelaySeconds: 4,
    firstCommentTemplate: '🔗 Try Social Autopilot today: https://socialautopilot.app \n\n#DevTools #AI #Automation',
    commentStrategy: 'AI_SMART',
  },
  X: {
    autoLike: true,
    autoComment: false,
    commentDelaySeconds: 3,
    firstCommentTemplate: '📌 Follow for daily AI & developer automation insights!',
    commentStrategy: 'AI_SMART',
  },
  INSTAGRAM: {
    autoLike: true,
    autoComment: true,
    commentDelaySeconds: 5,
    firstCommentTemplate: '✨ Save this post & check out the link in bio for more details!',
    commentStrategy: 'AI_SMART',
  },
  FACEBOOK: {
    autoLike: true,
    autoComment: true,
    commentDelaySeconds: 4,
    firstCommentTemplate: '🌐 Visit our official page for more updates and product news!',
    commentStrategy: 'AI_SMART',
  },
};

export default function EngagementStudioPage() {
  const [settings, setSettings] = useState<EngagementSettings>(DEFAULT_SETTINGS);
  const [activePlatform, setActivePlatform] = useState<AllowedPlatform>('LINKEDIN');
  const [connectedAccounts, setConnectedAccounts] = useState<SocialAccount[]>([]);
  const [visiblePlatforms, setVisiblePlatforms] = useState<AllowedPlatform[]>(['LINKEDIN']);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    // 1. Load persisted engagement settings from localStorage
    const saved = localStorage.getItem('engagement_studio_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse engagement settings:', e);
      }
    }

    // 2. Fetch User Role, Admin Feature Access Matrix & Real Connected Accounts
    const initData = async () => {
      setLoading(true);
      try {
        const [meRes, activeAccs] = await Promise.all([
          ApiService.getMe(),
          ApiService.getConnectedAccounts(),
        ]);

        if (Array.isArray(activeAccs)) {
          setConnectedAccounts(activeAccs);
        }

        const role = (meRes?.role || 'USER').toUpperCase();
        const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';

        if (isSuperAdmin) {
          // SuperAdmin sees all platforms
          setVisiblePlatforms(['LINKEDIN', 'X', 'INSTAGRAM', 'FACEBOOK']);
        } else if (meRes && Array.isArray(meRes.allowedPlatforms)) {
          // Regular User sees platforms enabled by SuperAdmin in DB Feature Matrix
          const allowed = meRes.allowedPlatforms.map((p: string) => p.toUpperCase() as AllowedPlatform);
          setVisiblePlatforms(allowed.length > 0 ? allowed : ['LINKEDIN']);
        } else {
          setVisiblePlatforms(['LINKEDIN']);
        }
      } catch (err) {
        console.warn('Failed to load accounts/permissions in Engagement Studio:', err);
        setVisiblePlatforms(['LINKEDIN']);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  const handleSaveSettings = () => {
    setIsSaving(true);
    try {
      localStorage.setItem('engagement_studio_settings', JSON.stringify(settings));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to save engagement settings:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const currentRule = settings[activePlatform] || DEFAULT_SETTINGS.LINKEDIN;

  const updateCurrentRule = (field: keyof PlatformEngagementRule, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [activePlatform]: {
        ...prev[activePlatform],
        [field]: value,
      },
    }));
  };

  const isCurrentPlatformConnected = connectedAccounts.some(
    (acc) => acc.platform.toUpperCase() === activePlatform && acc.isActive
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#2563EB]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-[#2563EB] text-white shadow-md shadow-blue-500/20">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20 uppercase tracking-wider">
                  Post-Publish Automation Engine
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
                  Engagement Studio
                </h1>
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)] max-w-2xl leading-relaxed">
              Configure post-publication auto-comments, initial auto-likes, link reach protection, and first-comment automation rules across all connected social channels.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="px-6 py-3 bg-[#2563EB] hover:bg-blue-700 text-white font-extrabold rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Settings Saved!</span>
              </>
            ) : (
              <>
                <Save className={`w-5 h-5 ${isSaving ? 'animate-spin' : ''}`} />
                <span>{isSaving ? 'Saving...' : 'Save Engagement Rules'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Platform Selector Tabs (Dynamic Matrix & Connected Status Badges) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-[var(--text-primary)] uppercase tracking-wider">
            Available Channels ({visiblePlatforms.length})
          </span>
          <Link
            href="/accounts"
            className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Manage Connected Channels</span>
          </Link>
        </div>

        <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-3 overflow-x-auto scrollbar-none">
          {visiblePlatforms.map((plat) => {
            const isConnected = connectedAccounts.some(
              (acc) => acc.platform.toUpperCase() === plat && acc.isActive
            );

            return (
              <button
                key={plat}
                type="button"
                onClick={() => setActivePlatform(plat)}
                className={`px-5 py-2.5 rounded-2xl font-extrabold text-xs transition-all flex items-center gap-2.5 cursor-pointer border ${
                  activePlatform === plat
                    ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-md shadow-blue-500/20'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-color)] hover:bg-[var(--bg-input)]'
                }`}
              >
                <span className="capitalize">{plat === 'X' ? 'X (Twitter)' : plat === 'FACEBOOK' ? 'Facebook Page' : plat}</span>
                
                {/* Real Connection Status Indicator */}
                {isConnected ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs" title="Account Connected & Active"></span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-amber-400/80" title="Not Connected (Action Required)"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Automation Toggles & Rules (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Auto-Like & Algorithm Signal */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <ThumbsUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                    Auto-Like Post-Publication
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Automatically likes your post 2 seconds after release to trigger initial feed reach.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={currentRule.autoLike}
                  onChange={(e) => updateCurrentRule('autoLike', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2563EB]"></div>
              </label>
            </div>
          </div>

          {/* Card 2: Auto-Post First Comment Rules */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                    Auto-Post First Comment
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Automatically posts product links & CTAs as the first comment to avoid reach penalty.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={currentRule.autoComment}
                  onChange={(e) => updateCurrentRule('autoComment', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2563EB]"></div>
              </label>
            </div>

            {currentRule.autoComment && (
              <div className="space-y-5 animate-in fade-in duration-200 pt-2 border-t border-[var(--border-color)]">
                {/* Simple AI Smart Comment Toggle */}
                <div className="flex items-center justify-between p-4 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-[#2563EB]/10 text-[#2563EB]">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-[var(--text-primary)]">
                        Use AI Smart Comment
                      </h4>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        AI automatically generates a relevant comment with emojis based on your post topic.
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={(currentRule.commentStrategy || 'AI_SMART') === 'AI_SMART'}
                      onChange={(e) => updateCurrentRule('commentStrategy', e.target.checked ? 'AI_SMART' : 'CUSTOM_TEMPLATE')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2563EB]"></div>
                  </label>
                </div>

                {/* Conditional View: If AI Smart Comment is OFF, show custom comment textarea */}
                {currentRule.commentStrategy === 'CUSTOM_TEMPLATE' ? (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <label className="text-xs font-extrabold text-[var(--text-primary)] flex items-center justify-between">
                      <span>Custom First Comment Text</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">Enter links, CTAs or custom text</span>
                    </label>
                    <textarea
                      rows={3}
                      value={currentRule.firstCommentTemplate}
                      onChange={(e) => updateCurrentRule('firstCommentTemplate', e.target.value)}
                      placeholder="Enter your custom comment (e.g. 🔗 Check out our platform: https://socialautopilot.app ✨ #AI #Tools)"
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] rounded-2xl p-4 text-xs leading-relaxed focus:outline-none focus:border-[#2563EB] transition-all font-sans"
                    />
                  </div>
                ) : (
                  <div className="p-3.5 bg-[#2563EB]/10 border border-[#2563EB]/25 rounded-2xl text-xs text-[#2563EB] font-medium flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      <b>AI Smart Comment Active:</b> AI will analyze each published post and generate a relevant first comment with engaging emojis (✨, 📌, 🚀, 💬, 👇) automatically.
                    </span>
                  </div>
                )}

                {/* Delay Picker - Light & Dark Mode High Contrast */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-[var(--text-primary)]">
                      Comment Execution Delay
                    </label>
                    <span className="text-xs font-black px-3 py-1 rounded-xl bg-[#2563EB] text-white shadow-xs">
                      {currentRule.commentDelaySeconds} Seconds
                    </span>
                  </div>
                  
                  <input
                    type="range"
                    min={2}
                    max={30}
                    step={1}
                    value={currentRule.commentDelaySeconds}
                    onChange={(e) => updateCurrentRule('commentDelaySeconds', parseInt(e.target.value))}
                    className="w-full h-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                  />
                  
                  <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                    Recommended delay is 3-5 seconds post-publication.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Connection & Outreach Status (1 Col) */}
        <div className="space-y-6">
          {/* Card 3: Account Connection & Shield Status */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[var(--text-primary)]">
                <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                <span>CHANNEL STATUS & SHIELD</span>
              </div>
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                isCurrentPlatformConnected ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isCurrentPlatformConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                {isCurrentPlatformConnected ? 'Connected & Active' : 'Not Connected'}
              </span>
            </div>

            <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)] font-medium">Selected Platform</span>
                <span className="font-extrabold text-[var(--text-primary)]">{activePlatform}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)] font-medium">Auto-Like Status</span>
                <span className={`font-extrabold px-2 py-0.5 rounded-full text-[10px] ${
                  currentRule.autoLike ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-400'
                }`}>
                  {currentRule.autoLike ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)] font-medium">Auto-Comment Mode</span>
                <span className={`font-extrabold px-2 py-0.5 rounded-full text-[10px] ${
                  currentRule.autoComment ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-400'
                }`}>
                  {currentRule.autoComment ? (currentRule.commentStrategy === 'CUSTOM_TEMPLATE' ? 'Custom Text' : 'AI Smart') : 'Disabled'}
                </span>
              </div>
            </div>

            {!isCurrentPlatformConnected ? (
              <div className="p-3.5 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400 space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{activePlatform} Account Not Connected</span>
                </div>
                <p className="leading-relaxed">
                  To execute live dispatches, auto-likes, and first comments for {activePlatform}, connect your account on the Channels page.
                </p>
                <Link
                  href="/accounts"
                  className="inline-flex items-center gap-1 font-extrabold text-[#2563EB] hover:underline pt-1"
                >
                  <span>Connect {activePlatform} Account</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="p-3.5 bg-[#2563EB]/10 rounded-2xl border border-[#2563EB]/20 text-[11px] text-[#2563EB] font-medium leading-relaxed">
                💡 <b>Why First Comments Matter:</b> Major algorithms suppress post visibility when links are placed in the main body text. Placing product URLs in the first comment maintains 100% full organic distribution!
              </div>
            )}
          </div>

          {/* Card 4: Recent Auto-Engagement Trail */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[var(--text-primary)]">
                <Zap className="w-4 h-4 text-[#2563EB]" />
                <span>AUTOMATION ACTIVITY TRAIL</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-color)] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[var(--text-primary)] text-[11px]">LinkedIn Auto-Comment</span>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Completed</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] truncate font-mono">
                  "✨ Try Social Autopilot today: https://socialautopilot.app"
                </p>
                <span className="text-[10px] text-[var(--text-secondary)] block pt-0.5">Triggered 4s post-publication</span>
              </div>

              <div className="p-3 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-color)] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[var(--text-primary)] text-[11px]">LinkedIn Auto-Like</span>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Completed</span>
                </div>
                <span className="text-[10px] text-[var(--text-secondary)] block">Triggered 2s post-publication</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
