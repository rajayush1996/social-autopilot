'use client';

import React, { useEffect, useState } from 'react';
import { 
  User as UserIcon, 
  Phone, 
  Calendar, 
  FileText, 
  Copy, 
  Check, 
  Save, 
  Image as ImageIcon,
  ShieldCheck,
  Coins,
  Search,
  Gift,
  CreditCard,
  Zap,
  Users,
  CheckCircle2,
  Lock,
  Activity,
  KeyRound
} from 'lucide-react';
import ApiService from '@/services/apiService';
import { User, SocialAccount } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Profile Form States
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  // Super Admin Credit Granting State
  const [targetUniqueId, setTargetUniqueId] = useState('');
  const [freeCreditValue, setFreeCreditValue] = useState<number>(100);
  const [grantingCredits, setGrantingCredits] = useState(false);

  // UX Feedback States
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const toast = useToast();

  const fetchProfileData = async () => {
    try {
      const [u, accs] = await Promise.all([
        ApiService.getMe(),
        ApiService.getConnectedAccounts(),
      ]);

      if (u) {
        setUser(u);
        setName(u.name || '');
        setPhoneNumber(u.phoneNumber || '');
        setBio(u.bio || '');
        setDateOfBirth(u.dateOfBirth ? u.dateOfBirth.split('T')[0] : '');
        setAvatarUrl(u.avatarUrl || '');
      }
      setSocialAccounts(accs || []);
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const updated = await ApiService.updateUserProfile({
        name,
        phoneNumber,
        bio,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : undefined,
        avatarUrl,
      });
      setUser(updated);
      toast.success('Profile details saved successfully!');
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handlePlanUpdate = async (targetPlan: 'FREE' | 'PREMIUM') => {
    setUpgradingPlan(targetPlan);
    try {
      const updatedUser = await ApiService.updateUserPlan('me', targetPlan);
      setUser(updatedUser);
      toast.success(`Account subscription plan tier updated to ${targetPlan}!`);
    } catch (err: any) {
      console.error('Failed to update plan:', err);
      toast.error(err.response?.data?.message || 'Failed to update plan.');
    } finally {
      setUpgradingPlan(null);
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
      fetchProfileData();
    } catch (err: any) {
      console.error('Failed to grant AI credits:', err);
      toast.error(err.response?.data?.message || 'Failed to grant AI credits.');
    } finally {
      setGrantingCredits(false);
    }
  };

  const copyUniqueId = () => {
    const textToCopy = user?.uniqueId || user?.id || '';
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedId(true);
      toast.success('Unique User ID copied to clipboard!');
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading user profile & account settings...</p>
      </div>
    );
  }

  const roleUpper = user?.role?.toUpperCase() || 'USER';
  const isSuperAdmin = roleUpper === 'SUPER_ADMIN' || roleUpper === 'ADMIN';
  const isPremium = user?.plan === 'PREMIUM';

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Profile & Platform Settings
          </h1>
          <p className="text-[var(--text-secondary)] mt-1 text-sm font-medium">
            Manage your personal credentials, profile setup, linked social channels, and security settings.
          </p>
        </div>

        {/* Unique ID Badge */}
        <div
          onClick={copyUniqueId}
          title="Click to copy Unique User ID"
          className="flex items-center gap-2.5 bg-[var(--bg-card)] hover:bg-[var(--bg-input)] px-3.5 py-2 rounded-xl border border-[var(--border-color)] cursor-pointer transition-all active:scale-95 shrink-0 self-start sm:self-auto shadow-xs"
        >
          <span className="text-xs text-[var(--text-secondary)] font-bold uppercase">Unique ID:</span>
          <span className="text-sm font-mono font-extrabold text-[#2563EB] dark:text-[#60A5FA]">{user?.uniqueId || user?.id}</span>
          {copiedId ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-[var(--text-secondary)]" />}
        </div>
      </div>

      {/* Super Admin Control Card (Visible only to Super Admin) */}
      {isSuperAdmin && (
        <div className="bg-[var(--bg-card)] border border-amber-500/30 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  Super Admin Management Panel
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    OWNER ACCESS
                  </span>
                </h2>
                <p className="text-xs text-[var(--text-secondary)] font-medium">System-wide credit distribution, user management, and API access tools.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                <Activity className="h-4 w-4" /> System Health: Operational
              </div>
            </div>
          </div>

          {/* Credit Granting API Form */}
          <form onSubmit={handleGrantCredits} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end pt-3 border-t border-[var(--border-color)]">
            <div className="sm:col-span-6 space-y-1">
              <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1">
                <Search className="h-3.5 w-3.5 text-[#2563EB]" /> Target User Unique ID or UUID
              </label>
              <input
                type="text"
                value={targetUniqueId}
                onChange={(e) => setTargetUniqueId(e.target.value)}
                placeholder="e.g. USR-611378 or UUID"
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#2563EB] font-mono"
              />
            </div>

            <div className="sm:col-span-3 space-y-1">
              <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1">
                <Coins className="h-3.5 w-3.5 text-amber-500" /> Free Credit Value
              </label>
              <input
                type="number"
                min="0"
                value={freeCreditValue}
                onChange={(e) => setFreeCreditValue(Number(e.target.value))}
                placeholder="100"
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#2563EB] font-mono font-bold"
              />
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={grantingCredits}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {grantingCredits ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Gift className="h-4 w-4" /> Grant Credits
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Form Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Personal Profile Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-6 shadow-sm">
            <h2 className="text-md font-bold flex items-center gap-2 pb-4 border-b border-[var(--border-color)] text-[var(--text-primary)]">
              <UserIcon className="h-5 w-5 text-[#2563EB]" />
              Personal Profile Setup
            </h2>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Avatar Image Picker */}
              <div className="flex items-center gap-4 p-4 bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)]">
                <div className="w-14 h-14 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/20 overflow-hidden flex items-center justify-center text-[#2563EB] font-bold shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="h-7 w-7" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1">
                    <ImageIcon className="h-3.5 w-3.5 text-[#2563EB]" /> Profile Avatar URL
                  </label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://media.avenar.in/uploads/avatar.jpg"
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[var(--text-primary)] block mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text-primary)] block mb-1.5 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-[#2563EB]" /> Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              {/* DOB & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[var(--text-primary)] block mb-1.5 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-[#2563EB]" /> Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text-primary)] block mb-1.5">Account Email (Verified)</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full bg-[var(--bg-input)]/60 border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-secondary)] cursor-not-allowed font-medium"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="text-xs font-bold text-[var(--text-primary)] block mb-1.5 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-[#2563EB]" /> Bio / Personal Description
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a brief overview of your background or social media goals..."
                  rows={4}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#2563EB] leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={updatingProfile}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {updatingProfile ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save Profile Changes
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Platform Status & Plan Billing */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Linked Social Platforms Card */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4 shadow-sm">
            <h2 className="text-md font-bold flex items-center justify-between pb-3 border-b border-[var(--border-color)] text-[var(--text-primary)]">
              <span className="flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-[#2563EB]" /> Linked Social Channels
              </span>
              <span className="text-xs text-[var(--text-secondary)] font-mono font-semibold">{socialAccounts.length} Connected</span>
            </h2>

            <div className="space-y-2.5">
              {['INSTAGRAM', 'LINKEDIN', 'X'].map((plat) => {
                const acc = socialAccounts.find((a) => a.platform.toUpperCase() === plat);
                const isConnected = !!acc;
                return (
                  <div key={plat} className="flex items-center justify-between p-3 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-xs' : 'bg-slate-400'}`} />
                      <div>
                        <span className="text-xs font-bold text-[var(--text-primary)] block">{plat}</span>
                        <span className="text-[10px] text-[var(--text-secondary)] font-mono">{isConnected ? `@${acc.username}` : 'Not Linked'}</span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      isConnected
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)]'
                    }`}>
                      {isConnected ? 'Active' : 'Disconnected'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subscription Plan Tier Card */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-5 shadow-sm">
            <h2 className="text-md font-bold flex items-center gap-2 pb-3 border-b border-[var(--border-color)] text-[var(--text-primary)]">
              <CreditCard className="h-4.5 w-4.5 text-[#2563EB]" />
              Subscription Tier & Credits
            </h2>

            <div className="p-4 bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)] font-bold uppercase">Current Tier</span>
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20 uppercase">
                  {user?.plan} PLAN
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
                <span className="text-xs text-[var(--text-secondary)] font-bold">AI Credits Balance</span>
                <span className="text-sm font-extrabold text-[#2563EB] font-mono">{user?.aiCredits ?? 0} Credits</span>
              </div>
            </div>

            <div className="space-y-3">
              {!isPremium ? (
                <button
                  type="button"
                  onClick={() => handlePlanUpdate('PREMIUM')}
                  disabled={upgradingPlan !== null}
                  className="w-full py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  {upgradingPlan === 'PREMIUM' ? 'Upgrading...' : 'Upgrade to Pro Premium ($29/mo)'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePlanUpdate('FREE')}
                  disabled={upgradingPlan !== null}
                  className="w-full py-2.5 bg-[var(--bg-input)] hover:bg-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {upgradingPlan === 'FREE' ? 'Downgrading...' : 'Switch to Starter Free Plan'}
                </button>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
