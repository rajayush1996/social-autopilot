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
  AlarmClock
} from 'lucide-react';
import ApiService from '@/services/apiService';
import SchedulingDispatcher from '@/components/SchedulingDispatcher';
import { User } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import LoadingScreen from '@/components/LoadingScreen';

export default function AutopilotSettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Autopilot Engine Form States
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [brandContext, setBrandContext] = useState('');
  
  // UX Feedback States
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const toast = useToast();

  const fetchAutopilotProfile = async () => {
    try {
      const u = await ApiService.getMe();
      if (u) {
        setUser(u);
        setAutopilotEnabled(u.autopilotEnabled);
        setBrandContext(u.brandContext || '');
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
      toast.success('Autopilot engine configurations saved successfully!');
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

              {/* System Audit & Production Logging Mode Control */}
              <div className="bg-slate-955 border border-slate-850 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Settings className="h-3.5 w-3.5 text-indigo-400" />
                      Production Logging & Audit Trail Mode
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Filters debug clutter in production while keeping critical error logs active
                    </p>
                  </div>

                  <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    Filtered Production Mode (Quiet)
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={updatingSettings}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
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
