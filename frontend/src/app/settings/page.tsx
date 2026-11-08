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
  Sun,
  Compass,
  Layers,
  Target,
  RefreshCw
} from 'lucide-react';
import ApiService from '@/services/apiService';
import SchedulingDispatcher from '@/components/SchedulingDispatcher';
import { User } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import LoadingScreen from '@/components/LoadingScreen';
import { getReviewPipelineNarrative } from '@/utils/date';
import OnboardingModal, { PERSONAS, NICHES, INTENTS, buildBrandVoiceNarrative } from '@/components/OnboardingModal';

export default function AutopilotSettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Autopilot Engine Form States
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [brandContext, setBrandContext] = useState('');
  const [globalDraftTime, setGlobalDraftTime] = useState('09:00');
  const [globalPublishTime, setGlobalPublishTime] = useState('20:00');
  const [globalTimezone, setGlobalTimezone] = useState('Asia/Kolkata');

  // Interactive Persona, Niche & Intent States
  const [selectedPersona, setSelectedPersona] = useState('FOUNDER');
  const [selectedNiche, setSelectedNiche] = useState('TECH_SAAS');
  const [selectedIntent, setSelectedIntent] = useState('VIRAL');
  const [showWizardModal, setShowWizardModal] = useState(false);
  
  // UX Feedback States
  const [savingPersona, setSavingPersona] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
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

  // Handler 1: Save Universal Brand Voice & Niche (Applies to Single Post Composer & Autopilot)
  const handleSaveBrandPersona = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPersona(true);
    try {
      // 1. Update Brand Context (Universal for Single Post & Autopilot)
      await ApiService.updateAutopilotSettings({
        userId: 'me',
        brandContext,
      });

      // 2. Update User Brand Name & Logo Avatar if modified
      if (user) {
        await ApiService.updateUserProfile({
          name: user.name || undefined,
          avatarUrl: user.avatarUrl || undefined,
        }).catch(() => {});
      }

      toast.success('✨ Brand Voice & Niche saved! Now actively powering Single Post Composer and AutoPilot.');
      fetchAutopilotProfile();
    } catch (err: any) {
      console.error('Failed to save Brand Voice settings:', err);
      toast.error(err.response?.data?.message || 'Failed to save Brand Voice settings.');
    } finally {
      setSavingPersona(false);
    }
  };

  // Handler 2: Save AutoPilot Daily Recurring Timings & Schedule
  const handleSaveAutopilotSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSchedule(true);
    try {
      // 1. Update Autopilot enable/disable flag
      await ApiService.updateAutopilotSettings({
        userId: 'me',
        autopilotEnabled,
      });

      // 2. Update schedule timings
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

      toast.success('⏰ AutoPilot publishing schedule & timings saved successfully!');
      fetchAutopilotProfile();
    } catch (err: any) {
      console.error('Failed to save schedule timings:', err);
      toast.error(err.response?.data?.message || 'Failed to save autopilot timings.');
    } finally {
      setSavingSchedule(false);
    }
  };

  if (loading) {
    return (
      <LoadingScreen 
        message="Querying engine configurations..." 
        subMessage="Loading AI persona context, schedule slots, and generation parameters"
      />
    );
  }

  const isPremium = user?.plan === 'PREMIUM';

  return (
    <div className="w-full max-w-full 2xl:max-w-[1600px] mx-auto space-y-6 sm:space-y-8 pb-12 animate-fadeIn">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
          Settings & Brand Voice
        </h1>
        <p className="text-[var(--text-secondary)] mt-1 text-sm font-medium">
          Manage your universal brand voice, industry niche, and automated social publishing schedule.
        </p>
      </div>

      {/* Configuration Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        
        {/* Left Column: Two Decoupled Forms */}
        <div className="lg:col-span-7 space-y-6">

          {/* CARD 1: Universal Brand Voice & Niche Profile */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)] flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Compass className="h-5 w-5 text-[#2563EB]" />
                  <h2 className="text-md font-bold text-[var(--text-primary)]">
                    Brand Voice & Niche Profile
                  </h2>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-[#2563EB] dark:text-[#60A5FA] border border-blue-200 dark:border-blue-800">
                    Powers Composer & AutoPilot
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] font-medium mt-1">
                  Shapes tone, niche vocabulary, and content generation in both <strong>Single Post Composer (/composer)</strong> and <strong>daily AutoPilot</strong>.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowWizardModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2563EB]/10 hover:bg-[#2563EB]/20 text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/25 text-xs font-extrabold transition-all cursor-pointer shadow-xs"
                title="Open 3-step setup modal"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Guided Setup Wizard</span>
              </button>
            </div>

            <form onSubmit={handleSaveBrandPersona} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Brand Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider block">
                    Brand / Company / Creator Name
                  </label>
                  <input
                    type="text"
                    value={user?.name || ''}
                    onChange={(e) => setUser(user ? { ...user, name: e.target.value } : null)}
                    placeholder="e.g. Ayush Raj / OmniSync"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                {/* Brand Logo URL */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider block">
                    Brand Logo / Avatar URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={user?.avatarUrl || ''}
                      onChange={(e) => setUser(user ? { ...user, avatarUrl: e.target.value } : null)}
                      placeholder="https://example.com/logo.png"
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[#2563EB]"
                    />
                    {user?.avatarUrl && (
                      <div className="w-9 h-9 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden shrink-0 shadow-xs">
                        <img src={user.avatarUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 1. Quick Identity Role Selector */}
              <div className="space-y-2 pt-1">
                <label className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#2563EB]" /> 1. Identity / Role
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PERSONAS.map((p) => {
                    const isSelected = selectedPersona === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPersona(p.id);
                          setBrandContext(buildBrandVoiceNarrative(p.id, selectedNiche, selectedIntent, user?.name || ''));
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                            : 'bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span>{p.icon}</span>
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Primary Field / Niche Selector */}
              <div className="space-y-2 pt-1">
                <label className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#2563EB]" /> 2. Primary Field / Niche
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {NICHES.map((n) => {
                    const isSelected = selectedNiche === n.id;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          setSelectedNiche(n.id);
                          setBrandContext(buildBrandVoiceNarrative(selectedPersona, n.id, selectedIntent, user?.name || ''));
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                            : 'bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span>{n.icon}</span>
                        <span>{n.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Primary Content Intent Selector */}
              <div className="space-y-2 pt-1">
                <label className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-[#2563EB]" /> 3. Content Intent & Style
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {INTENTS.map((intent) => {
                    const isSelected = selectedIntent === intent.id;
                    return (
                      <button
                        key={intent.id}
                        type="button"
                        onClick={() => {
                          setSelectedIntent(intent.id);
                          setBrandContext(buildBrandVoiceNarrative(selectedPersona, selectedNiche, intent.id, user?.name || ''));
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                            : 'bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span>{intent.icon}</span>
                        <span>{intent.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editable Brand Niche & AI Context */}
              <div className="space-y-2 pt-2 bg-[var(--bg-input)]/70 border border-[var(--border-color)] p-4 rounded-2xl">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-[11px] font-extrabold text-[var(--text-primary)] uppercase tracking-wider block">
                    Brand Voice, Audience Context & Keywords (100% Editable)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setBrandContext(buildBrandVoiceNarrative(selectedPersona, selectedNiche, selectedIntent, user?.name || ''));
                      toast.info('Template auto-filled from selected chips! You can customize it freely.');
                    }}
                    className="text-[10px] font-bold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Auto-fill from chips
                  </button>
                </div>
                <textarea
                  value={brandContext}
                  onChange={(e) => setBrandContext(e.target.value)}
                  placeholder="Define your niche, target demographics, product offerings, tone of voice, and keywords (e.g. 'Daily spiritual reflections, sacred mantras, mindfulness meditation...')"
                  rows={4}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#2563EB] leading-relaxed font-sans"
                />
                <span className="text-[10px] text-[var(--text-secondary)] block leading-normal font-medium">
                  💡 This context actively informs <strong>Single Post Composer</strong> prompt generation and <strong>AutoPilot</strong> daily drafts.
                </span>
              </div>

              <button
                type="submit"
                disabled={savingPersona}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {savingPersona ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Save Brand Voice & Niche
                  </>
                )}
              </button>
            </form>
          </div>

          {/* CARD 2: AutoPilot Recurring Publishing Timings & Cadence */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
              <div>
                <div className="flex items-center gap-2">
                  <AlarmClock className="h-5 w-5 text-indigo-500" />
                  <h2 className="text-md font-bold text-[var(--text-primary)]">
                    AutoPilot Recurring Schedule Timings
                  </h2>
                </div>
                <span className="text-[11px] text-[var(--text-secondary)] font-medium block mt-0.5">
                  Automated daily draft creation, approval review window, and live social dispatch
                </span>
              </div>

              {/* Master Autopilot Switch */}
              <button
                type="button"
                onClick={() => setAutopilotEnabled(!autopilotEnabled)}
                className="focus:outline-none transition-transform active:scale-95 text-[#2563EB] cursor-pointer"
                title={autopilotEnabled ? 'Autopilot Active' : 'Autopilot Disabled'}
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

            <form onSubmit={handleSaveAutopilotSchedule} className="space-y-6">
              {/* 2-Stage Review & Publishing Pipeline Controls */}
              <div className="bg-[var(--bg-input)]/60 border border-[var(--border-color)] p-4 rounded-2xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider flex items-center gap-1.5">
                    <AlarmClock className="w-4 h-4" /> Daily Dispatch Timings
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
                disabled={savingSchedule}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {savingSchedule ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <AlarmClock className="h-4 w-4" /> Save AutoPilot Schedule & Timings
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Engine Info & Architectural Guidelines */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Universal Brand Voice Impact */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 backdrop-blur-md space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 pb-3 border-b border-[var(--border-color)]">
              <Sparkles className="h-4 w-4 text-[#2563EB]" /> Universal Brand Voice Engine
            </h3>

            <ul className="text-xs text-[var(--text-secondary)] space-y-3 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] mt-1.5 shrink-0" />
                <span><strong className="text-[var(--text-primary)]">Powers Single Post Composer:</strong> Every prompt you type in <code>/composer</code> inherits this brand voice, niche terminology, and audience tone automatically.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] mt-1.5 shrink-0" />
                <span><strong className="text-[var(--text-primary)]">Zero Hardcoded Niches:</strong> Whether you are in Spiritual guidance, Fitness coaching, B2B SaaS, or Creative Design, the engine strictly speaks in your chosen brand voice.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] mt-1.5 shrink-0" />
                <span><strong className="text-[var(--text-primary)]">Anti-Hallucination Shield:</strong> Spiritual and wellness prompts are shielded from software/tech jargon and fake website URLs.</span>
              </li>
            </ul>
          </div>

          {/* Card: Autopilot Schedule Workflow */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 backdrop-blur-md space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 pb-3 border-b border-[var(--border-color)]">
              <Zap className="h-4 w-4 text-indigo-500" /> AutoPilot Automation Workflow
            </h3>

            <ul className="text-xs text-[var(--text-secondary)] space-y-3 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <span><strong className="text-[var(--text-primary)]">AI Context Generation:</strong> Uses your active brand context to craft daily tailored posts and select visual styles.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <span><strong className="text-[var(--text-primary)]">Approval Window via Email:</strong> You receive an email preview at Draft Time with 1-click Approve or Edit links before anything publishes.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <span><strong className="text-[var(--text-primary)]">BullMQ Social Dispatch:</strong> Once approved (or if review passes), worker dispatches automatically at your scheduled Publish Time.</span>
              </li>
            </ul>
          </div>
        </div>

      </div>

      {/* Embedded Scheduling Dispatcher Section */}
      <div className="pt-6 border-t border-[var(--border-color)]">
        <SchedulingDispatcher />
      </div>

      {/* Guided Setup Wizard Modal */}
      <OnboardingModal
        isOpen={showWizardModal}
        onClose={() => setShowWizardModal(false)}
        onSaved={(newCtx, newName) => {
          setBrandContext(newCtx);
          if (newName) setUser((prev) => (prev ? { ...prev, name: newName } : null));
          fetchAutopilotProfile();
        }}
        initialBrandContext={brandContext}
        initialName={user?.name || ''}
      />
    </div>
  );
}
