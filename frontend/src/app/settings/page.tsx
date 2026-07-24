'use client';

import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  Settings, 
  ToggleLeft, 
  ToggleRight, 
  Building2, 
  CreditCard, 
  CheckCircle2, 
  Zap, 
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import ApiService from '@/services/apiService';
import SchedulingDispatcher from '@/components/SchedulingDispatcher';
import { User } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import CONFIG from '@/config';

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Settings Form States
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [brandContext, setBrandContext] = useState('');
  
  // UX Feedback States
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);
  const toast = useToast();

  const fetchProfile = async () => {
    try {
      const u = await ApiService.getUserProfile('me');
      if (u) {
        setUser(u);
        setAutopilotEnabled(u.autopilotEnabled);
        setBrandContext(u.brandContext || '');
      }
    } catch (err) {
      console.error('Failed to load settings profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveSettings = async () => {
    setUpdatingSettings(true);
    try {
      await ApiService.updateAutopilotSettings({
        userId: 'me',
        autopilotEnabled,
        brandContext,
      });
      toast.success('Autopilot and brand settings updated successfully!');
      fetchProfile();
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      toast.error(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handlePlanUpdate = async (targetPlan: 'FREE' | 'PREMIUM') => {
    setUpgradingPlan(targetPlan);
    try {
      const updatedUser = await ApiService.updateUserPlan('me', targetPlan);
      setUser(updatedUser);
      toast.success(`Account subscription plan tier successfully updated to ${targetPlan}!`);
    } catch (err: any) {
      console.error('Failed to update plan:', err);
      toast.error(err.response?.data?.message || 'Failed to update plan.');
    } finally {
      setUpgradingPlan(null);
    }
  };

  const handleRoleToggle = async () => {
    if (!user) return;
    setUpdatingRole(true);
    const newRole = user.role.toUpperCase() === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      const updatedUser = await ApiService.updateUserRole('me', newRole);
      setUser(updatedUser);
      toast.success(`RBAC Role changed to ${newRole}! Sidebar visibility updated.`);
    } catch (err: any) {
      console.error('Failed to change role:', err);
      toast.error(err.response?.data?.message || 'Failed to update role.');
    } finally {
      setUpdatingRole(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Querying account metadata...</p>
      </div>
    );
  }

  const isPremium = user?.plan === 'PREMIUM';

  return (
    <div className="space-y-12">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
          Account & Autopilot Settings
        </h1>
        <p className="text-slate-400 mt-1">
          Configure daily autonomous publishing details and manage your plan tiers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Brand Context Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md space-y-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-850">
              <h2 className="text-md font-bold flex items-center gap-2">
                <Settings className="h-4.5 w-4.5 text-indigo-400" />
                Autopilot Configurations
              </h2>

              {/* Toggle switch */}
              <button
                type="button"
                onClick={() => setAutopilotEnabled(!autopilotEnabled)}
                className="focus:outline-none transition-transform active:scale-95 text-indigo-400"
              >
                {autopilotEnabled ? (
                  <ToggleRight className="h-10 w-10" />
                ) : (
                  <ToggleLeft className="h-10 w-10 text-slate-600" />
                )}
              </button>
            </div>

            {/* Warning if Autopilot is premium but user is Free */}
            {autopilotEnabled && !isPremium && (
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex gap-3 text-amber-400">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <div className="text-xs space-y-1">
                  <p className="font-bold">Feature Locked under Free Plan</p>
                  <p className="text-amber-400/80">
                    The Autopilot daily recurring posting feature is currently flagged as a **PREMIUM** tier feature in the Admin settings. Your daily queue runs will be skipped until you upgrade your account to Premium.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1.5 flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  Your Brand / Company Context
                </label>
                <textarea
                  value={brandContext}
                  onChange={(e) => setBrandContext(e.target.value)}
                  placeholder="Define your niche, what products you sell, target demographics, and keywords (e.g. 'We are an organic bakery selling vegan sourdough and chocolate cupcakes in Seattle...')"
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-850 rounded-2xl px-4 py-3.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 transition-colors leading-relaxed"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  The Autopilot AI Agent uses this context to automatically research and formulate daily unique updates for your feeds.
                </span>
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={updatingSettings}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all duration-300 shadow-md shadow-indigo-950/20 active:scale-95 disabled:opacity-50"
              >
                {updatingSettings ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving settings...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Save Autopilot Settings
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* Right Side: Plan Billing Cards */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md space-y-5">
            <h2 className="text-md font-bold flex items-center gap-2 pb-3 border-b border-slate-850">
              <CreditCard className="h-4.5 w-4.5 text-indigo-400" />
              Manage Subscription Plan
            </h2>

            <div className="space-y-4">
              {/* FREE tier card */}
              <div className={`border rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 ${
                !isPremium 
                  ? 'border-indigo-500 bg-indigo-950/10' 
                  : 'border-slate-800 bg-slate-950/50'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-100">Starter Free Plan</h3>
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">15 free credits/month</span>
                  </div>
                  <span className="text-lg font-bold text-slate-200">$0</span>
                </div>
                
                {!isPremium ? (
                  <span className="mt-4 inline-block text-center text-xs font-bold bg-slate-800 text-slate-300 py-1.5 rounded-lg border border-slate-700 cursor-default">
                    Active Plan
                  </span>
                ) : (
                  <button
                    onClick={() => handlePlanUpdate('FREE')}
                    disabled={upgradingPlan !== null}
                    className="mt-4 w-full py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all"
                  >
                    Downgrade Account
                  </button>
                )}
              </div>

              {/* PREMIUM tier card */}
              <div className={`border rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
                isPremium 
                  ? 'border-indigo-500 bg-indigo-950/10' 
                  : 'border-slate-800 bg-slate-950/50'
              }`}>
                {/* Premium tag */}
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[8px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-lg">
                  Popular
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1">
                      <Zap className="h-4 w-4 text-indigo-400" />
                      Pro Premium Plan
                    </h3>
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">Unlimited queue scheduling</span>
                  </div>
                  <span className="text-lg font-bold text-slate-200">$29/mo</span>
                </div>

                <ul className="text-[10px] text-slate-400 space-y-1.5 mt-3 leading-relaxed">
                  <li>✔ Unlock **Autonomous Daily Autopilot Posting**</li>
                  <li>✔ Unlimited OpenAI tailored copy drafts</li>
                  <li>✔ Premium HD video upload pipeline via Cloudinary</li>
                  <li>✔ Automated token refreshes and prioritised queue</li>
                </ul>
                
                {isPremium ? (
                  <span className="mt-4 inline-block text-center text-xs font-bold bg-slate-800 text-slate-300 py-1.5 rounded-lg border border-slate-700 cursor-default">
                    Active Plan
                  </span>
                ) : (
                  <button
                    onClick={() => handlePlanUpdate('PREMIUM')}
                    disabled={upgradingPlan !== null}
                    className="mt-4 w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-900/10 hover:shadow-indigo-900/20 active:scale-95"
                  >
                    {upgradingPlan === 'PREMIUM' ? 'Upgrading...' : 'Upgrade Account'}
                  </button>
                )}
              </div>
            </div>

            {/* Developer RBAC Control Simulator card */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 space-y-3.5 mt-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 pb-2.5 border-b border-slate-855">
                <ShieldCheck className="h-4.5 w-4.5" />
                RBAC Simulator
              </h2>
              <p className="text-[10px] text-slate-400 leading-normal">
                Toggle between a standard **USER** role and an **ADMIN** (Owner) role to check sidebar visibility and access control guards.
              </p>
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-855">
                <div>
                  <span className="text-[8px] text-slate-500 font-bold uppercase block">Active role</span>
                  <span className="text-xs font-black text-slate-200 uppercase">{user?.role}</span>
                </div>
                <button
                  onClick={handleRoleToggle}
                  disabled={updatingRole}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-bold transition-all duration-300 active:scale-95"
                >
                  {updatingRole ? 'Updating...' : `Switch to ${user?.role === 'ADMIN' ? 'USER' : 'ADMIN'}`}
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Scheduling Dispatcher Embedded Section */}
      <div className="pt-6 border-t border-slate-850">
        <SchedulingDispatcher />
      </div>
    </div>
  );
}
