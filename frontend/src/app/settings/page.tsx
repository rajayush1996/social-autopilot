'use client';

import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  Settings, 
  ToggleLeft, 
  ToggleRight, 
  Building2, 
  ShieldAlert, 
  Zap, 
  AlarmClock,
  Moon,
  Sun
} from 'lucide-react';
import ApiService from '@/services/apiService';
import SchedulingDispatcher from '@/components/SchedulingDispatcher';
import { User } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import LoadingScreen from '@/components/LoadingScreen';
import { getReviewPipelineNarrative } from '@/utils/date';

export default function AutopilotSettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Autopilot Engine Form States
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [brandContext, setBrandContext] = useState('');
  const [globalDraftTime, setGlobalDraftTime] = useState('09:00');
  const [globalPublishTime, setGlobalPublishTime] = useState('20:00');
  const [globalTimezone, setGlobalTimezone] = useState('Asia/Kolkata');
  
  // UX Feedback States
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const toast = useToast();

  const fetchAutopilotProfile = async () => {
    try {
      const [u, schedRes] = await Promise.all([
        ApiService.getMe(),
        ApiService.getUserSchedules().catch(() => null),
      ]);
      if (u) {
        setUser(u);
        setAutopilotEnabled(u.autopilotEnabled);
        setBrandContext(u.brandContext || '');
      }
      if (schedRes && schedRes.schedules && schedRes.schedules.length > 0) {
        const firstSched = schedRes.schedules[0];
        if (firstSched.draftTimeOfDay) setGlobalDraftTime(firstSched.draftTimeOfDay);
        if (firstSched.timeOfDay) setGlobalPublishTime(firstSched.timeOfDay);
        if (firstSched.timezone) setGlobalTimezone(firstSched.timezone);
      }
    } catch (err) {
      console.error('Failed to load autopilot settings profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutopilotProfile();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingSettings(true);
    try {
      await ApiService.updateAutopilotSettings({
        userId: 'me',
        autopilotEnabled,
        brandContext,
      });

      // Also ensure default schedule timings match
      const schedRes = await ApiService.getUserSchedules().catch(() => null);
      if (schedRes && schedRes.schedules && schedRes.schedules.length > 0) {
        for (const s of schedRes.schedules) {
          await ApiService.updateSchedule(s.id, {
            draftTimeOfDay: globalDraftTime,
            timeOfDay: globalPublishTime,
            timezone: globalTimezone,
          }).catch(() => {});
        }
      }

      toast.success('Autopilot engine and workflow timings saved successfully!');
      fetchAutopilotProfile();
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      toast.error(err.response?.data?.message || 'Failed to save autopilot settings.');
    } finally {
      setUpdatingSettings(false);
    }
  };

  if (loading) {
    return (
      <LoadingScreen 
        message="Querying Autopilot engine configurations..." 
        subMessage="Loading brand context, schedule slots, and AI generation parameters"
      />
    );
  }

  const isPremium = user?.plan === 'PREMIUM';

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
          OmniSync Engine Settings
        </h1>
        <p className="text-[var(--text-secondary)] mt-1 text-sm font-medium">
          Configure daily autonomous AI post generation, brand niche context, and recurring alarm dispatches.
        </p>
      </div>

      {/* Autopilot Configuration Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Autopilot Brand & Engine Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-6 shadow-sm">
            
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
              <div>
                <h2 className="text-md font-bold flex items-center gap-2 text-[var(--text-primary)]">
                  <Settings className="h-5 w-5 text-[#2563EB]" />
                  OmniSync Engine Controls
                </h2>
                <span className="text-[10px] text-[var(--text-secondary)] font-semibold">
                  Enable or disable automated daily publishing cycles
                </span>
              </div>

              {/* Master Autopilot Switch */}
              <button
                type="button"
                onClick={() => setAutopilotEnabled(!autopilotEnabled)}
                className="focus:outline-none transition-transform active:scale-95 text-[#2563EB] cursor-pointer"
              >
                {autopilotEnabled ? (
                  <ToggleRight className="h-11 w-11 text-emerald-500" />
                ) : (
                  <ToggleLeft className="h-11 w-11 text-[var(--text-secondary)]" />
                )}
              </button>
            </div>

            {/* Locked feature warning for Free Plan */}
            {autopilotEnabled && !isPremium && (
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex gap-3 text-amber-500">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <div className="text-xs space-y-1">
                  <p className="font-bold">Pro Premium Feature Notice</p>
                  <p className="opacity-90">
                    The Autopilot daily recurring posting feature requires a **PREMIUM** subscription tier. Your daily queue runs will be paused until you upgrade.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div>
                <label className="text-xs text-[var(--text-primary)] font-bold block mb-1.5 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-[#2563EB]" />
                  Brand / Company Niche & Context Setup
                </label>
                <textarea
                  value={brandContext}
                  onChange={(e) => setBrandContext(e.target.value)}
                  placeholder="Define your niche, target demographics, product offerings, tone of voice, and keywords (e.g. 'We are a boutique coffee shop in Chicago specializing in single-origin cold brews...')"
                  rows={6}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#2563EB] leading-relaxed font-sans"
                />
                <span className="text-[10px] text-[var(--text-secondary)] block mt-1.5 leading-normal font-medium">
                  💡 The Autopilot AI Agent consumes this context to formulate daily relevant updates across your connected accounts.
                </span>
              </div>

              {/* 2-Stage Review & Publishing Pipeline Controls */}
              <div className="bg-[var(--bg-input)]/60 border border-[var(--border-color)] p-4 rounded-2xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider flex items-center gap-1.5">
                    <AlarmClock className="w-4 h-4" /> Global AutoPilot Schedule Timings
                  </span>
                  <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-[#2563EB] font-bold px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                    Approval Review Safe
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Stage 1: AI Draft & Review Email Time */}
                  <div className="space-y-1 bg-[var(--bg-card)] border border-[var(--border-color)] p-3.5 rounded-xl">
                    <label className="text-xs font-bold text-[var(--text-primary)] block">
                      🌅 1. AI Draft & Review Email Time
                    </label>
                    <p className="text-[10px] text-[var(--text-secondary)]">Time when AI generates content and sends approval email</p>
                    <input
                      type="time"
                      value={globalDraftTime}
                      onChange={(e) => setGlobalDraftTime(e.target.value)}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] font-mono font-bold mt-1"
                    />
                  </div>

                  {/* Stage 2: Live Publishing Dispatch Time */}
                  <div className="space-y-1 bg-[var(--bg-card)] border border-[var(--border-color)] p-3.5 rounded-xl">
                    <label className="text-xs font-bold text-[var(--text-primary)] block">
                      🚀 2. Live Social Dispatch Time
                    </label>
                    <p className="text-[10px] text-[var(--text-secondary)]">Time when approved post goes live to social channels</p>
                    <input
                      type="time"
                      value={globalPublishTime}
                      onChange={(e) => setGlobalPublishTime(e.target.value)}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] font-mono font-bold mt-1"
                    />
                  </div>
                </div>

                {/* Timezone */}
                <div className="pt-1">
                  <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block mb-1">Timezone</label>
                  <select
                    value={globalTimezone}
                    onChange={(e) => setGlobalTimezone(e.target.value)}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] font-mono"
                  >
                    <option value="Asia/Kolkata">IST (UTC+5:30) - India</option>
                    <option value="UTC">UTC (Universal Coordinated Time)</option>
                    <option value="America/New_York">EST (UTC-5:00) - New York</option>
                    <option value="America/Los_Angeles">PST (UTC-8:00) - Los Angeles</option>
                    <option value="Europe/London">GMT (UTC+0:00) - London</option>
                  </select>
                </div>

                {/* Dynamic Review Window Banner */}
                {(() => {
                  const pipeline = getReviewPipelineNarrative(globalDraftTime, globalPublishTime);
                  return (
                    <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${
                      pipeline.isOvernight 
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-700/60 text-indigo-950 dark:text-indigo-100'
                        : 'bg-blue-50/90 dark:bg-blue-950/70 border-blue-200 dark:border-blue-700/60 text-blue-950 dark:text-blue-100'
                    }`}>
                      <div className="flex items-start gap-2.5">
                        {pipeline.isOvernight ? (
                          <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                        ) : (
                          <Sun className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-0.5">
                          <span className="text-xs leading-relaxed font-medium block">
                            {pipeline.isOvernight ? (
                              <>
                                Draft created the evening before at <strong className="text-indigo-900 dark:text-white font-extrabold">{pipeline.draftTimeDisplay}</strong> ➔ Review & approve via email before live auto-dispatch next morning at <strong className="text-indigo-900 dark:text-white font-extrabold">{pipeline.publishTimeDisplay} (Next Day)</strong>.
                              </>
                            ) : (
                              <>
                                Draft created daily at <strong className="text-blue-900 dark:text-white font-extrabold">{pipeline.draftTimeDisplay}</strong> ➔ Review & approve via email before live auto-dispatch at <strong className="text-blue-900 dark:text-white font-extrabold">{pipeline.publishTimeDisplay}</strong>.
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border shrink-0 ${pipeline.badgeColorClass}`}>
                        {pipeline.reviewWindowText} Window
                      </span>
                    </div>
                  );
                })()}
              </div>

              <button
                type="submit"
                disabled={updatingSettings}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {updatingSettings ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Save Autopilot Engine Settings
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Engine Info & Guidelines */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 pb-3 border-b border-slate-850">
              <Zap className="h-4 w-4 text-indigo-400" /> How Autopilot Automation Works
            </h3>

            <ul className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <span><strong>AI Context Research:</strong> Uses your brand context to craft tailored captions and select matching visual assets.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <span><strong>BullMQ Worker Queue:</strong> Automatically dispatches posts to Instagram, LinkedIn, and X without manual intervention.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <span><strong>Real-time Notifications:</strong> Emits instant WebSocket updates when posts publish or require manual retries.</span>
              </li>
            </ul>
          </div>
        </div>

      </div>

      {/* Embedded Scheduling Dispatcher Section */}
      <div className="pt-6 border-t border-slate-850">
        <SchedulingDispatcher />
      </div>
    </div>
  );
}
