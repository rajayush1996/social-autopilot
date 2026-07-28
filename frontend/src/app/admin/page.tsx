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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Querying Super Admin control center...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] gap-4 max-w-md mx-auto text-center animate-fadeIn">
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl">
          <ShieldAlert className="h-9 w-9" />
        </div>
        <h2 className="text-lg font-bold text-slate-100">Super Admin Access Required</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          The Admin Control Center and Credit Granting API are strictly restricted to Super Administrators.
        </p>
        <Link href="/" className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold transition-all">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
          Super Admin Control Center
        </h1>
        <p className="text-slate-400 mt-1">
          Manage system-wide feature flags, grant user AI credits by Unique ID, and trigger dispatchers.
        </p>
      </div>

      {/* Super Admin AI Credit Granting Banner */}
      <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-slate-900/60 border border-indigo-500/40 rounded-3xl p-6 backdrop-blur-md shadow-2xl space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600/30 border border-indigo-500/40 rounded-xl text-indigo-300">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-100">Super Admin AI Credit Granting API</h2>
            <p className="text-xs text-slate-400">Set or grant free AI credits to any user directly by their Unique User ID or UUID.</p>
          </div>
        </div>

        <form onSubmit={handleGrantCredits} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end pt-2">
          <div className="sm:col-span-6 space-y-1">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
              <Search className="h-3.5 w-3.5 text-indigo-400" /> User Unique ID / UUID
            </label>
            <input
              type="text"
              value={targetUniqueId}
              onChange={(e) => setTargetUniqueId(e.target.value)}
              placeholder="e.g. USR-108273 or 9907302c-a65e-4cc1-a102-d5444f1c44c4"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div className="sm:col-span-3 space-y-1">
            <label className="text-xs font-bold text-slate-300">Free Credit Value</label>
            <input
              type="number"
              min="0"
              value={freeCreditValue}
              onChange={(e) => setFreeCreditValue(Number(e.target.value))}
              placeholder="100"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono font-bold"
            />
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={grantingCredits}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
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
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/30 border border-indigo-500/40 rounded-xl text-indigo-300">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-100">Subscription Plan Feature Access Matrix</h2>
              <p className="text-xs text-slate-400">Configure which social channels are enabled or hidden for Free, Pro, and Enterprise creator plans.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSavePlanMatrix}
            disabled={savingMatrix}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {savingMatrix ? 'Saving Matrix...' : 'Save Plan Matrix'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          {(['FREE', 'PRO', 'ENTERPRISE'] as const).map((plan) => {
            const allowed = planMatrix[plan]?.allowedPlatforms || [];

            return (
              <div key={plan} className="bg-slate-955 border border-slate-850 rounded-2xl p-5 space-y-4 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-200">{plan} PLAN</span>
                  <span className="text-[10px] text-indigo-400 font-bold font-mono">
                    {allowed.length} Channels Allowed
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Allowed Social Channels</label>
                  <div className="flex flex-col gap-2">
                    {(['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'X'] as const).map((plt) => {
                      const isEnabled = allowed.includes(plt);

                      return (
                        <button
                          key={plt}
                          type="button"
                          onClick={() => handleTogglePlatformInPlan(plan, plt)}
                          className={`w-full py-2.5 px-3 rounded-xl border text-xs font-extrabold transition-all duration-200 flex items-center justify-between cursor-pointer ${
                            isEnabled
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-750'
                          }`}
                        >
                          <span>{plt}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            isEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
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
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600/30 border border-indigo-500/40 rounded-xl text-indigo-300">
              <AlarmClock className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-slate-100">Scheduling Dispatcher Master Switch</h2>
            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              dispatcherEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {dispatcherEnabled ? 'Active for Users' : 'Disabled System-Wide'}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            When this master toggle is <strong>ENABLED</strong>, the Scheduling Dispatcher appears in the user section, allowing creators to configure alarm-style calendar recurring auto-dispatches.
          </p>
        </div>

        {/* Master Toggle Switch */}
        <div className="flex items-center gap-3 shrink-0 bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
          <div className="text-right">
            <span className="text-xs font-bold text-slate-200 block">Full Automation</span>
            <span className="text-[10px] text-slate-400 block">{dispatcherEnabled ? 'ON' : 'OFF'}</span>
          </div>
          <button
            onClick={handleToggleMasterDispatcher}
            disabled={togglingMaster}
            className="focus:outline-none transition-transform active:scale-95 text-indigo-400 disabled:opacity-50 cursor-pointer"
          >
            {dispatcherEnabled ? (
              <ToggleRight className="h-11 w-11 text-indigo-500" />
            ) : (
              <ToggleLeft className="h-11 w-11 text-slate-600" />
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Dynamic Feature Flags */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md space-y-6 shadow-xl">
            <h2 className="text-md font-bold flex items-center gap-2 pb-3 border-b border-slate-850 text-slate-100">
              <Settings className="h-4.5 w-4.5 text-indigo-400" />
              Dynamic Feature Flags & Access Controls
            </h2>

            <div className="divide-y divide-slate-800/60">
              {features.map((feat) => {
                const isUpdating = updatingFeature === feat.feature;
                return (
                  <div key={feat.id} className="py-4 flex items-center justify-between first:pt-0 last:pb-0">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-200 capitalize">{feat.feature.replace('-', ' ')}</p>
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                        Requires Premium subscription: 
                        <span className={`ml-1 font-extrabold ${feat.isPremium ? 'text-indigo-400' : 'text-slate-400'}`}>
                          {feat.isPremium ? 'YES' : 'NO'}
                        </span>
                      </span>
                    </div>

                    <button
                      onClick={() => handleTogglePremium(feat.feature, feat.isPremium)}
                      disabled={isUpdating}
                      className="focus:outline-none transition-transform active:scale-95 text-indigo-400 disabled:opacity-50 cursor-pointer"
                    >
                      {feat.isPremium ? (
                        <ToggleRight className="h-10 w-10 text-indigo-500" />
                      ) : (
                        <ToggleLeft className="h-10 w-10 text-slate-600" />
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
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md space-y-5 shadow-xl">
            <h2 className="text-md font-bold flex items-center gap-2 pb-3 border-b border-slate-850 text-slate-100">
              <Radio className="h-4.5 w-4.5 text-indigo-400" />
              Scheduling Dispatcher Runner
            </h2>

            <p className="text-xs text-slate-400 leading-relaxed">
              Manually trigger the full automation scheduling dispatcher. Evaluates active recurring schedules for qualified users and queues AI content generation jobs into BullMQ.
            </p>

            <button
              onClick={handleTriggerDispatcherNow}
              disabled={runningDispatcher || !dispatcherEnabled}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl font-bold text-xs transition-all duration-300 shadow-md disabled:opacity-50 cursor-pointer"
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
              <div className="space-y-3 mt-6 pt-5 border-t border-slate-800/60">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Execution Log Reports</span>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {reports.map((rep, idx) => (
                    <div key={idx} className="bg-slate-955 border border-slate-850 rounded-xl p-3 flex items-start justify-between gap-3 text-[10px]">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-300">{rep.name || 'Schedule Dispatch'}</p>
                        {rep.userId && <p className="text-slate-500 font-mono">User: {rep.userId}</p>}
                        {rep.postId && <p className="text-indigo-400 font-mono">Post ID: {rep.postId}</p>}
                      </div>
                      <span className={`font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        rep.status === 'SUCCESS'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
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
