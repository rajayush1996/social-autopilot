'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  Link2, 
  ExternalLink,
  Unlink, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Building2,
  User,
  Plus
} from 'lucide-react';
import ApiService from '@/services/apiService';
import CONFIG from '@/config';
import { SocialAccount } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { formatDate } from '@/utils/date';

import LoadingScreen from '@/components/LoadingScreen';

// Custom Instagram icon component
function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

// Custom Linkedin icon component
function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

// Custom X (Twitter) icon component
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
      <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
    </svg>
  );
}

import accountEvents from '@/utils/accountEvents';
import socketClient from '@/utils/socket';
import { SOCIAL_PLATFORMS, DEFAULT_ALLOWED_PLATFORMS, PlatformKey } from '@/constants/platforms';

export default function SocialAccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [simulateMode, setSimulateMode] = useState(false);
  const [allowedPlatforms, setAllowedPlatforms] = useState<string[]>([...DEFAULT_ALLOWED_PLATFORMS]);
  const [platformStatus, setPlatformStatus] = useState<Record<string, 'ENABLED' | 'COMING_SOON' | 'DISABLED'>>({
    INSTAGRAM: 'ENABLED',
    LINKEDIN: 'ENABLED',
    LINKEDIN_COMMUNITY: 'COMING_SOON',
    FACEBOOK: 'COMING_SOON',
    X: 'COMING_SOON',
  });
  const toast = useToast();

  const isFetchingRef = useRef(false);

  const fetchAccounts = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const activeAccounts = await ApiService.getConnectedAccounts();
      if (Array.isArray(activeAccounts)) {
        setAccounts(activeAccounts);
      }
    } catch (err) {
      console.error('Failed to query connected accounts:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    socketClient.connect();

    const initPageData = async () => {
      setLoading(true);
      try {
        const [meRes, activeAccounts, platformStatusRes] = await Promise.all([
          ApiService.getMe(),
          ApiService.getConnectedAccounts(),
          ApiService.getPlatformStatusMatrix().catch(() => ({})),
        ]);

        if (platformStatusRes && Object.keys(platformStatusRes).length > 0) {
          setPlatformStatus((prev) => ({ ...prev, ...platformStatusRes }));
        }

        if (meRes && Array.isArray(meRes.allowedPlatforms)) {
          setAllowedPlatforms(meRes.allowedPlatforms.map((p: string) => p.toUpperCase()));
        } else {
          setAllowedPlatforms([...DEFAULT_ALLOWED_PLATFORMS]);
        }

        if (Array.isArray(activeAccounts)) {
          setAccounts(activeAccounts);
        }
      } catch (err) {
        console.warn('Failed to load accounts permissions:', err);
        setAllowedPlatforms([...DEFAULT_ALLOWED_PLATFORMS]);
      } finally {
        setLoading(false);
      }

      // Check for callback parameters when returning from real OAuth provider redirect
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const connected = params.get('connected');
        const error = params.get('error');

        if (connected) {
          toast.success(`Successfully connected your real ${connected} profile!`);
          accountEvents.notifyAccountChange('CONNECTED', connected.toUpperCase());
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (error) {
          toast.error(`OAuth Connection Error: ${decodeURIComponent(error)}`);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    initPageData();
  }, []);

  const handleConnect = async (platform: 'INSTAGRAM' | 'LINKEDIN' | 'X' | 'FACEBOOK', accountType: 'PERSONAL' | 'ORGANIZATION' = 'PERSONAL') => {
    const actionKey = `${platform}_${accountType}`;
    setActionLoading(actionKey);

    if (simulateMode) {
      try {
        let username = `mock_${platform.toLowerCase()}_creator`;

        if (platform === 'LINKEDIN') {
          if (accountType === 'ORGANIZATION') {
            username = 'Avenar (Company Page)';
          } else {
            username = 'Ayush Raj (Personal Profile)';
          }
        }

        await ApiService.connectMockAccount(
          platform,
          username,
          accountType
        );
        toast.success(`Linked mock ${platform} ${accountType === 'ORGANIZATION' ? 'Company Page' : 'account'} (Sandbox Mode).`);
        accountEvents.notifyAccountChange('CONNECTED', platform);
        fetchAccounts();
      } catch (mockErr) {
        console.error('Mock connect failed:', mockErr);
        toast.error('Failed to connect mock account.');
      } finally {
        setActionLoading(null);
      }
      return;
    }

    try {
      // Get OAuth redirect link using ApiService with target accountType
      const authUrl = await ApiService.getOAuthUrl(platform, accountType);

      if (authUrl) {
        window.location.href = authUrl;
      } else {
        toast.error('Failed to generate OAuth URL.');
      }
    } catch (err: any) {
      console.error('OAuth URL Generation Error:', err);
      toast.error(err.response?.data?.message || 'Failed to initiate OAuth redirection.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (accountId: string, platform: string) => {
    setActionLoading(accountId);
    try {
      await ApiService.disconnectAccount(accountId);
      toast.success(`Disconnected ${platform} account successfully.`);
      accountEvents.notifyAccountChange('DISCONNECTED', platform.toUpperCase());
      fetchAccounts();
    } catch (err) {
      console.error('Disconnect Error:', err);
      toast.error('Failed to disconnect account.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <LoadingScreen 
        message="Querying active OAuth profiles..." 
        subMessage="Syncing connected social channels and token health"
      />
    );
  }

  // Helper selectors
  const findAccount = (platform: string) => 
    accounts.find(acc => acc.platform?.toUpperCase() === platform?.toUpperCase());

  const platforms = [
    {
      id: 'INSTAGRAM' as const,
      name: 'Instagram',
      icon: InstagramIcon,
      color: 'from-pink-600 to-rose-500 shadow-rose-900/20',
      textColor: 'text-pink-400 border-pink-500/20 bg-pink-500/10',
      desc: 'Publish pictures and high-performing Reels directly to business accounts via Graph API.',
    },
    {
      id: 'LINKEDIN' as const,
      name: 'LinkedIn',
      icon: LinkedinIcon,
      color: 'from-blue-600 to-indigo-500 shadow-blue-900/20',
      textColor: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
      desc: 'Build professional thought leadership and corporate presence with structured media posts.',
    },
    {
      id: 'X' as const,
      name: 'X (formerly Twitter)',
      icon: XIcon,
      color: 'from-slate-800 to-slate-900 shadow-slate-900/40',
      textColor: 'text-slate-400 border-slate-700 bg-slate-800/50',
      desc: 'Broadcast real-time concise thoughts, trends, and hashtags under 280-character guidelines.',
    },
    {
      id: 'FACEBOOK' as const,
      name: 'Facebook Page',
      icon: FacebookIcon,
      color: 'from-blue-600 to-blue-800 shadow-blue-900/30',
      textColor: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
      desc: 'Publish posts, photos, and video updates directly to your managed Facebook Business Pages.',
    },
  ];

  const isSandboxEnabled = process.env.NEXT_PUBLIC_ENABLE_SANDBOX === 'true';

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 animate-fadeIn w-full max-w-full 2xl:max-w-[1600px] mx-auto">
      {/* Page Header with Real-time Socket & Sandbox Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 pb-6 border-b border-[var(--border-color)]">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Social Platforms Connection
          </h1>
          <p className="text-[var(--text-secondary)] mt-1 text-sm font-medium">
            Link and manage your credentials for Instagram, Facebook Pages, LinkedIn, and X/Twitter.
          </p>
        </div>

        {/* Sandbox Toggle (Controlled via NEXT_PUBLIC_ENABLE_SANDBOX in .env) */}
        {isSandboxEnabled && (
          <div className="flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-color)] px-4 py-2.5 rounded-xl shadow-xs">
            <label className="text-xs font-semibold text-[var(--text-secondary)] cursor-pointer select-none flex items-center gap-1.5" htmlFor="simulate-toggle">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Developer Sandbox Mode
            </label>
            <input
              type="checkbox"
              id="simulate-toggle"
              checked={simulateMode}
              onChange={(e) => setSimulateMode(e.target.checked)}
              className="accent-[#2563EB] h-4 w-4 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Cards list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-4 gap-4 sm:gap-5">
        {platforms
          .filter((plt) => {
            const status = platformStatus[plt.id];
            if (status === 'DISABLED') return false;
            return true;
          })
          .map((plt) => {
          const Icon = plt.icon;
          const platformAccounts = accounts.filter(acc => acc.platform?.toUpperCase() === plt.id);
          const isLinked = platformAccounts.length > 0;
          const isLoading = actionLoading === plt.id;
          const isPlatformComingSoon = (platformStatus[plt.id] || 'COMING_SOON') !== 'ENABLED';

          return (
            <div 
              key={plt.id} 
              className={`bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-sm hover:border-[#2563EB]/40 ${
                isLinked ? 'ring-1 ring-[#2563EB]/30' : ''
              }`}
            >
              {/* Card Header Top */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 bg-gradient-to-br ${plt.color} rounded-xl text-white shadow-md`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                    isLinked 
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                      : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border-color)]'
                  }`}>
                    {isLinked ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse shadow-xs" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                    )}
                    {isLinked ? `${platformAccounts.length} Connected` : 'Unlinked'}
                  </span>
                </div>

                <h2 className="text-base font-bold text-[var(--text-primary)]">{plt.name}</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed font-medium">{plt.desc}</p>
              </div>

              {/* Connected details or button */}
              <div className="mt-6 pt-4 border-t border-[var(--border-color)] space-y-3">
                {isLinked ? (
                  <div className="space-y-2.5">
                    {platformAccounts.map((linkedAccount) => {
                      const isOrg = linkedAccount.accountType === 'ORGANIZATION';
                      const isAccLoading = actionLoading === linkedAccount.id;

                      return (
                        <div key={linkedAccount.id} className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              {linkedAccount.avatarUrl ? (
                                <img src={linkedAccount.avatarUrl} alt={linkedAccount.username} className="w-8 h-8 rounded-xl object-cover border border-[var(--border-color)] shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-xl border border-[#2563EB]/25 bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-bold text-xs shrink-0">
                                  {isOrg ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                </div>
                              )}
                              <div className="overflow-hidden">
                                <p className="text-xs font-bold text-[var(--text-primary)] truncate">{linkedAccount.username}</p>
                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border inline-flex items-center gap-1 mt-0.5 bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/25">
                                  {isOrg ? <Building2 className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                                  {isOrg ? 'Page' : 'Personal Profile'}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleDisconnect(linkedAccount.id, plt.name)}
                              disabled={isAccLoading}
                              className="p-2 bg-[var(--bg-card)] hover:bg-rose-500/10 border border-[var(--border-color)] hover:border-rose-500/30 text-[var(--text-secondary)] hover:text-rose-500 rounded-xl transition-all cursor-pointer"
                              title="Disconnect Account"
                            >
                              {isAccLoading ? (
                                <span className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin block" />
                              ) : (
                                <Unlink className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* LinkedIn-specific additional connection button */}
                    {plt.id === 'LINKEDIN' ? (
                      (() => {
                        const isOrgComingSoon = (platformStatus['LINKEDIN_COMMUNITY'] || 'COMING_SOON') !== 'ENABLED';

                        if (!platformAccounts.some((a) => a.accountType === 'ORGANIZATION')) {
                          if (isOrgComingSoon) {
                            return (
                              <div className="w-full py-2.5 px-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs font-bold flex items-center justify-between text-amber-600 dark:text-amber-400 mt-2">
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-3.5 h-3.5" />
                                  <span>Company Pages (Community API)</span>
                                </div>
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                                  Coming Soon
                                </span>
                              </div>
                            );
                          }
                          return (
                            <button
                              type="button"
                              onClick={() => handleConnect('LINKEDIN', 'ORGANIZATION')}
                              disabled={Boolean(actionLoading)}
                              className="w-full h-11 px-3 bg-[#2563EB]/10 hover:bg-[#2563EB]/20 text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/30 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs mt-2 disabled:opacity-50"
                            >
                              {actionLoading === 'LINKEDIN_ORGANIZATION' ? (
                                <span className="w-3.5 h-3.5 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Building2 className="w-3.5 h-3.5 text-[#2563EB]" />
                              )}
                              <span>+ Connect Pages</span>
                            </button>
                          );
                        } else if (!platformAccounts.some((a) => a.accountType === 'PERSONAL')) {
                          return (
                            <button
                              type="button"
                              onClick={() => handleConnect('LINKEDIN', 'PERSONAL')}
                              disabled={Boolean(actionLoading)}
                              className="w-full h-11 px-3 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/20 mt-2 disabled:opacity-50"
                            >
                              {actionLoading === 'LINKEDIN_PERSONAL' ? (
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <User className="w-3.5 h-3.5" />
                              )}
                              <span>+ Connect Personal Profile</span>
                            </button>
                          );
                        } else {
                          return (
                            <button
                              type="button"
                              onClick={() => handleConnect('LINKEDIN', 'ORGANIZATION')}
                              disabled={Boolean(actionLoading) || isOrgComingSoon}
                              className="w-full h-9 px-3 bg-[var(--bg-input)] hover:bg-[#2563EB]/10 border border-[var(--border-color)] hover:border-[#2563EB]/30 text-[var(--text-secondary)] hover:text-[#2563EB] rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer mt-1 disabled:opacity-50"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Re-sync Pages</span>
                            </button>
                          );
                        }
                      })()
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConnect(plt.id)}
                        disabled={Boolean(actionLoading)}
                        className="w-full h-9 px-3 bg-[var(--bg-input)] hover:bg-[#2563EB]/10 border border-[var(--border-color)] hover:border-[#2563EB]/30 text-[var(--text-secondary)] hover:text-[#2563EB] rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer mt-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Re-sync Account</span>
                      </button>
                    )}
                  </div>
                ) : (
                  plt.id === 'LINKEDIN' ? (
                    (() => {
                      const isOrgComingSoon = (platformStatus['LINKEDIN_COMMUNITY'] || 'COMING_SOON') !== 'ENABLED';

                      return (
                        <div className="space-y-2.5">
                          <button
                            type="button"
                            onClick={() => handleConnect('LINKEDIN', 'PERSONAL')}
                            disabled={Boolean(actionLoading)}
                            className="w-full h-11 px-4 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-50"
                          >
                            {actionLoading === 'LINKEDIN_PERSONAL' ? (
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <User className="w-4 h-4" />
                            )}
                            <span>Connect Personal Profile</span>
                          </button>

                          {isOrgComingSoon ? (
                            <div className="w-full py-2.5 px-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs font-bold flex items-center justify-between text-amber-600 dark:text-amber-400">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5" />
                                <span>Company Pages</span>
                              </div>
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                                Coming Soon
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleConnect('LINKEDIN', 'ORGANIZATION')}
                              disabled={Boolean(actionLoading)}
                              className="w-full h-11 px-4 bg-[#2563EB]/10 hover:bg-[#2563EB]/20 text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/30 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                            >
                              {actionLoading === 'LINKEDIN_ORGANIZATION' ? (
                                <span className="w-4 h-4 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Building2 className="w-4 h-4 text-[#2563EB]" />
                              )}
                              <span>Connect Pages</span>
                            </button>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConnect(plt.id)}
                      disabled={Boolean(actionLoading)}
                      className="w-full h-11 px-4 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-50"
                    >
                      {actionLoading === `${plt.id}_PERSONAL` || actionLoading === plt.id ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4" />
                          <span>Connect {plt.name}</span>
                        </>
                      )}
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
