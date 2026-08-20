'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, 
  Settings, 
  ToggleLeft, 
  ToggleRight, 
  Play, 
  Sparkles, 
  AlarmClock,
  CheckCircle2, 
  AlertCircle, 
  Building,
  Zap,
  Radio,
  Coins,
  Search,
  Gift
} from 'lucide-react';
import Link from 'next/link';
import CONFIG from '@/config';
import ApiService, { FeatureConfig } from '@/services/apiService';
import { useToast } from '@/context/ToastContext';
import LoadingScreen from '@/components/LoadingScreen';

interface DispatcherReport {
  scheduleId?: string;
  userId?: string;
  name?: string;
  status: 'SUCCESS' | 'SKIPPED' | 'FAILED';
  postId?: string;
  reason?: string;
}

export default function AdminPage() {
  const [features, setFeatures] = useState<FeatureConfig[]>([]);
  const [dispatcherEnabled, setDispatcherEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [runningDispatcher, setRunningDispatcher] = useState(false);
  const [togglingMaster, setTogglingMaster] = useState(false);
  const [reports, setReports] = useState<DispatcherReport[]>([]);
  const [updatingFeature, setUpdatingFeature] = useState<string | null>(null);

  // Super Admin Plan Feature Matrix State
  const [planMatrix, setPlanMatrix] = useState<Record<string, { allowedPlatforms: string[]; maxAiCredits?: number }>>({
    FREE: { allowedPlatforms: ['INSTAGRAM', 'LINKEDIN'], maxAiCredits: 15 },
    PRO: { allowedPlatforms: ['INSTAGRAM', 'LINKEDIN', 'X'], maxAiCredits: 500 },
    ENTERPRISE: { allowedPlatforms: ['INSTAGRAM', 'LINKEDIN', 'X'], maxAiCredits: 9999 },
  });
  const [savingMatrix, setSavingMatrix] = useState(false);

  const toast = useToast();

  const fetchAdminData = async () => {
    try {
      const [profile, list, statusRes, matrixRes] = await Promise.all([
        ApiService.getMe(),
        ApiService.getFeatures(),
        ApiService.getDispatcherStatus(),
        ApiService.getPlanFeatures(),
      ]);
      setFeatures(list);
      setDispatcherEnabled(statusRes.dispatcherEnabled);
      if (matrixRes) {
        setPlanMatrix(matrixRes);
      }
      const roleUpper = profile.role?.toUpperCase();
      setIsAuthorized(roleUpper === 'SUPER_ADMIN' || roleUpper === 'ADMIN');
    } catch (err: any) {
      console.error('Failed to load admin configurations:', err);
      if (err.response?.status === 403) {
        setIsAuthorized(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleTogglePremium = async (featureName: string, currentPremiumVal: boolean) => {
    setUpdatingFeature(featureName);
    try {
      await ApiService.updateFeaturePremium(featureName, !currentPremiumVal);
      toast.success(`Feature "${featureName}" access criteria updated successfully.`);
      fetchAdminData();
    } catch (err: any) {
      console.error('Failed to toggle feature premium:', err);
      toast.error(err.response?.data?.message || 'Failed to update feature config.');
    } finally {
      setUpdatingFeature(null);
    }
  };

  const handleToggleMasterDispatcher = async () => {
    setTogglingMaster(true);
    try {
      const nextState = !dispatcherEnabled;
      const res = await ApiService.setAdminDispatcherStatus(nextState);
      setDispatcherEnabled(res);
      toast.success(`Scheduling Dispatcher master switch set to ${res ? 'ENABLED' : 'DISABLED'}.`);
    } catch (err: any) {
      console.error('Failed to toggle master dispatcher:', err);
      toast.error('Failed to change master dispatcher state.');
    } finally {
      setTogglingMaster(false);
    }
  };

  const handleTriggerDispatcherNow = async () => {
    setRunningDispatcher(true);
    setReports([]);
    try {
      const res = await ApiService.triggerDispatcherCycle();
      setReports(res.reports || []);
      toast.success('Scheduling Dispatcher engine cycle executed successfully!');
    } catch (err: any) {
      console.error('Failed to run scheduling dispatcher:', err);
      toast.error(err.response?.data?.message || 'Failed to trigger dispatcher cycle.');
    } finally {
      setRunningDispatcher(false);
    }
  };

  // Super Admin AI Credit Granting State
  const [targetUniqueId, setTargetUniqueId] = useState('');
  const [freeCreditValue, setFreeCreditValue] = useState<number>(100);
  const [grantingCredits, setGrantingCredits] = useState(false);

  const handleTogglePlatformInPlan = (plan: string, platform: string) => {
    setPlanMatrix((prev) => {
      const currentAllowed = prev[plan]?.allowedPlatforms || [];
      const exists = currentAllowed.includes(platform);
      const nextAllowed = exists
        ? currentAllowed.filter((p) => p !== platform)
        : [...currentAllowed, platform];

      return {
        ...prev,
        [plan]: {
          ...(prev[plan] || {}),
          allowedPlatforms: nextAllowed,
        },
      };
    });
  };

  const handleSavePlanMatrix = async () => {
    setSavingMatrix(true);
    try {
      await ApiService.setPlanFeatures(planMatrix);
      toast.success('Plan Feature Access Matrix saved! Features will show/hide for users dynamically.');
    } catch (err: any) {
      console.error('Failed to save plan matrix:', err);
      toast.error(err.response?.data?.message || 'Failed to update plan feature matrix.');
    } finally {
      setSavingMatrix(false);
    }
  };

  const handleGrantCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUniqueId.trim()) {
      toast.error('Please enter a User ID or Unique Tag ID.');
      return;
    }

    setGrantingCredits(true);
    try {
      const result = await ApiService.grantUserCredits({
        uniqueId: targetUniqueId.trim(),
        freeCreditValue: Number(freeCreditValue),
      });
      toast.success(`Granted ${freeCreditValue} AI Credits to user "${result.user.name || result.user.email}"!`);
      setTargetUniqueId('');
    } catch (err: any) {
      console.error('Failed to grant AI credits:', err);
      toast.error(err.response?.data?.message || 'Failed to grant AI credits to user.');
    } finally {
      setGrantingCredits(false);
    }
  };

  if (loading) {
    return (
      <LoadingScreen 
        message="Querying Super Admin control center..." 
        subMessage="Validating administrative permissions and feature flags"
      />
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] gap-4 max-w-md mx-auto text-center animate-fadeIn">
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl">
          <ShieldAlert className="h-9 w-9" />
        </div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Super Admin Access Required</h2>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          The Admin Control Center and Credit Granting API are strictly restricted to Super Administrators.
        </p>
        <Link href="/" className="px-6 py-2.5 bg-[var(--bg-input)] hover:bg-slate-200 dark:hover:bg-slate-800 border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] text-xs font-semibold transition-all shadow-xs">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
          Super Admin Control Center
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          Manage system-wide feature flags, grant user AI credits by Unique ID, and trigger dispatchers.
        </p>
      </div>

      {/* Super Admin AI Credit Granting Banner */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[var(--text-primary)]">Super Admin AI Credit Granting API</h2>
            <p className="text-xs text-[var(--text-secondary)]">Set or grant free AI credits to any user directly by their Unique User ID or UUID.</p>
          </div>
        </div>

        <form onSubmit={handleGrantCredits} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end pt-2">
          <div className="sm:col-span-6 space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1">
              <Search className="h-3.5 w-3.5 text-indigo-500" /> User Unique ID / UUID
            </label>
            <input
              type="text"
              value={targetUniqueId}
              onChange={(e) => setTargetUniqueId(e.target.value)}
              placeholder="e.g. USR-108273 or 9907302c-a65e-4cc1-a102-d5444f1c44c4"
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div className="sm:col-span-3 space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)]">Free Credit Value</label>
            <input
              type="number"
              min="0"
              value={freeCreditValue}
              onChange={(e) => setFreeCreditValue(Number(e.target.value))}
              placeholder="100"
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 font-mono font-bold"
            />
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={grantingCredits}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {grantingCredits ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Gift className="h-4 w-4" /> Grant AI Credits
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Plan Feature Access Matrix Setup Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-2xl text-[#2563EB]">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Subscription Plan Feature Access Matrix</h2>
              <p className="text-xs font-semibold text-[var(--text-secondary)]">Configure which social channels are enabled or hidden for Free, Pro, and Enterprise creator plans.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSavePlanMatrix}
            disabled={savingMatrix}
            className="px-6 py-3 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {savingMatrix ? 'Saving Matrix...' : 'Save Plan Matrix'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {(['FREE', 'PRO', 'ENTERPRISE'] as const).map((plan) => {
            const allowed = planMatrix[plan]?.allowedPlatforms || [];

            return (
              <div key={plan} className="bg-[var(--bg-input)]/50 border border-[var(--border-color)] rounded-2xl p-5 space-y-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                  <span className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)]">{plan} PLAN</span>
                  <span className="text-xs text-[#2563EB] font-extrabold font-mono px-3 py-1 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-full">
                    {allowed.length} Allowed
                  </span>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] text-[var(--text-secondary)] font-extrabold uppercase tracking-wider block">Allowed Social Channels</label>
                  <div className="flex flex-col gap-3">
                    {(['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'X'] as const).map((plt) => {
                      const isEnabled = allowed.includes(plt);

                      return (
                        <button
                          key={plt}
                          type="button"
                          onClick={() => handleTogglePlatformInPlan(plan, plt)}
                          className={`w-full py-3 px-4 rounded-xl border-2 text-xs font-black transition-all duration-200 flex items-center justify-between cursor-pointer ${
                            isEnabled
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/50 shadow-xs'
                              : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-slate-400'
                          }`}
                        >
                          <span className="text-xs font-black tracking-wide">{plt}</span>
                          <span className={`text-[10px] px-3 py-1 rounded-lg font-black uppercase tracking-wider border ${
                            isEnabled 
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs' 
                              : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border-color)]'
                          }`}>
                            {isEnabled ? 'ENABLED' : 'HIDDEN'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Master Scheduling Dispatcher Banner */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400">
              <AlarmClock className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-[var(--text-primary)]">Scheduling Dispatcher Master Switch</h2>
            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              dispatcherEnabled
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
            }`}>
              {dispatcherEnabled ? 'Active for Users' : 'Disabled System-Wide'}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            When this master toggle is <strong>ENABLED</strong>, the Scheduling Dispatcher appears in the user section, allowing creators to configure alarm-style calendar recurring auto-dispatches.
          </p>
        </div>

        {/* Master Toggle Switch */}
        <div className="flex items-center gap-3 shrink-0 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-4">
          <div className="text-right">
            <span className="text-xs font-bold text-[var(--text-primary)] block">Full Automation</span>
            <span className="text-[10px] text-[var(--text-secondary)] block">{dispatcherEnabled ? 'ON' : 'OFF'}</span>
          </div>
          <button
            onClick={handleToggleMasterDispatcher}
            disabled={togglingMaster}
            className="focus:outline-none transition-transform active:scale-95 text-indigo-500 disabled:opacity-50 cursor-pointer"
          >
            {dispatcherEnabled ? (
              <ToggleRight className="h-11 w-11 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <ToggleLeft className="h-11 w-11 text-slate-400 dark:text-slate-600" />
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Dynamic Feature Flags */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 space-y-6 shadow-xl">
            <h2 className="text-md font-bold flex items-center gap-2 pb-3 border-b border-[var(--border-color)] text-[var(--text-primary)]">
              <Settings className="h-4.5 w-4.5 text-indigo-500" />
              Dynamic Feature Flags & Access Controls
            </h2>

            <div className="divide-y divide-[var(--border-color)]">
              {features.map((feat) => {
                const isUpdating = updatingFeature === feat.feature;
                return (
                  <div key={feat.id} className="py-4 flex items-center justify-between first:pt-0 last:pb-0">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-[var(--text-primary)] capitalize">{feat.feature.replace('-', ' ')}</p>
                      <span className="text-[10px] text-[var(--text-secondary)] font-semibold block uppercase">
                        Requires Premium subscription: 
                        <span className={`ml-1 font-extrabold ${feat.isPremium ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-secondary)]'}`}>
                          {feat.isPremium ? 'YES' : 'NO'}
                        </span>
                      </span>
                    </div>

                    <button
                      onClick={() => handleTogglePremium(feat.feature, feat.isPremium)}
                      disabled={isUpdating}
                      className="focus:outline-none transition-transform active:scale-95 text-indigo-500 disabled:opacity-50 cursor-pointer"
                    >
                      {feat.isPremium ? (
                        <ToggleRight className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <ToggleLeft className="h-10 w-10 text-slate-400 dark:text-slate-600" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Dispatcher Cycle Trigger */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 space-y-5 shadow-xl">
            <h2 className="text-md font-bold flex items-center gap-2 pb-3 border-b border-[var(--border-color)] text-[var(--text-primary)]">
              <Radio className="h-4.5 w-4.5 text-indigo-500" />
              Scheduling Dispatcher Runner
            </h2>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Manually trigger the full automation scheduling dispatcher. Evaluates active recurring schedules for qualified users and queues AI content generation jobs into BullMQ.
            </p>

            <button
              onClick={handleTriggerDispatcherNow}
              disabled={runningDispatcher || !dispatcherEnabled}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {runningDispatcher ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Running Scheduling Dispatcher...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" /> Run Scheduling Dispatcher Engine
                </>
              )}
            </button>

            {reports.length > 0 && (
              <div className="space-y-3 mt-6 pt-5 border-t border-[var(--border-color)]">
                <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Execution Log Reports</span>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {reports.map((rep, idx) => (
                    <div key={idx} className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 flex items-start justify-between gap-3 text-[10px]">
                      <div className="space-y-1">
                        <p className="font-semibold text-[var(--text-primary)]">{rep.name || 'Schedule Dispatch'}</p>
                        {rep.userId && <p className="text-[var(--text-secondary)] font-mono">User: {rep.userId}</p>}
                        {rep.postId && <p className="text-indigo-600 dark:text-indigo-400 font-mono">Post ID: {rep.postId}</p>}
                      </div>
                      <span className={`font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        rep.status === 'SUCCESS'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                      }`}>
                        {rep.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
