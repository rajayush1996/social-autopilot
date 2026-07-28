'use client';

import React, { useEffect, useState } from 'react';
import { 
  Link2, 
  Unlink, 
  CheckCircle2, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import ApiService from '@/services/apiService';
import CONFIG from '@/config';
import { SocialAccount } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { formatDate } from '@/utils/date';

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

export default function SocialAccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [simulateMode, setSimulateMode] = useState(false);
  const [allowedPlatforms, setAllowedPlatforms] = useState<string[]>([]);
  const toast = useToast();

  useEffect(() => {
    const fetchPermissionsAndAccounts = async () => {
      try {
        const [meRes, activeAccounts] = await Promise.all([
          ApiService.getMe(),
          ApiService.getConnectedAccounts(),
        ]);

        if (meRes && Array.isArray(meRes.allowedPlatforms)) {
          setAllowedPlatforms(meRes.allowedPlatforms.map((p) => p.toUpperCase()));
        } else {
          setAllowedPlatforms(['INSTAGRAM', 'LINKEDIN', 'X', 'FACEBOOK']);
        }

        if (Array.isArray(activeAccounts)) {
          setAccounts(activeAccounts);
        }
      } catch (err) {
        console.warn('Failed to load accounts permissions:', err);
        setAllowedPlatforms(['INSTAGRAM', 'LINKEDIN', 'X', 'FACEBOOK']);
      } finally {
        setLoading(false);
      }
    };
    fetchPermissionsAndAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const activeAccounts = await ApiService.getConnectedAccounts();
      if (Array.isArray(activeAccounts)) {
        setAccounts(activeAccounts);
      }
    } catch (err) {
      console.error('Failed to query connected accounts:', err);
    }
  };

  useEffect(() => {
    socketClient.connect();
    fetchAccounts();

    // Check for callback parameters when returning from real OAuth provider redirect
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const connected = params.get('connected');
      const error = params.get('error');

      if (connected) {
        toast.success(`Successfully connected your real ${connected} profile!`);
        accountEvents.notifyAccountChange('CONNECTED', connected.toUpperCase());
        window.history.replaceState({}, document.title, window.location.pathname);
        fetchAccounts();
      } else if (error) {
        toast.error(`OAuth Connection Error: ${decodeURIComponent(error)}`);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [toast]);

  const handleConnect = async (platform: 'INSTAGRAM' | 'LINKEDIN' | 'X' | 'FACEBOOK') => {
    setActionLoading(platform);

    if (simulateMode) {
      try {
        await ApiService.connectMockAccount(
          platform,
          `mock_${platform.toLowerCase()}_creator`
        );
        toast.success(`Successfully linked mock ${platform} account (Sandbox Simulation Mode).`);
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
      // Get OAuth redirect link using ApiService
      const authUrl = await ApiService.getOAuthUrl(platform);

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Querying active OAuth profiles...</p>
      </div>
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
            Social Platforms Connection
          </h1>
          <p className="text-slate-400 mt-1">
            Link and manage your credentials for Instagram, Facebook Pages, LinkedIn, and X/Twitter.
          </p>
        </div>

        {/* Sandbox Toggle */}
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-2xl">
          <label className="text-xs font-semibold text-slate-300 cursor-pointer select-none" htmlFor="simulate-toggle">
            Sandbox Simulation Mode
          </label>
          <input
            type="checkbox"
            id="simulate-toggle"
            checked={simulateMode}
            onChange={(e) => setSimulateMode(e.target.checked)}
            className="accent-indigo-600 h-4 w-4 cursor-pointer"
          />
        </div>
      </div>

      {/* Cards list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {platforms
          .filter((plt) => allowedPlatforms.includes(plt.id))
          .map((plt) => {
          const Icon = plt.icon;
          const linkedAccount = findAccount(plt.id);
          const isLinked = !!linkedAccount;
          const isLoading = actionLoading === plt.id || (isLinked && actionLoading === linkedAccount.id);

          return (
            <div 
              key={plt.id} 
              className={`bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 relative overflow-hidden backdrop-blur-md hover:border-slate-700/80 ${
                isLinked ? 'ring-1 ring-indigo-500/20' : ''
              }`}
            >
              {/* Card Header Top */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 bg-gradient-to-br ${plt.color} rounded-2xl text-white shadow-lg`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                    isLinked 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-slate-955 text-slate-400 border-slate-800'
                  }`}>
                    {isLinked ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse shadow-sm shadow-emerald-400/60" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />
                    )}
                    {isLinked ? 'Connected' : 'Unlinked'}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-slate-100">{plt.name}</h2>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{plt.desc}</p>
              </div>

              {/* Connected details or button */}
              <div className="mt-8 pt-4 border-t border-slate-800/60">
                {isLinked ? (
                  <div className="space-y-4">
                    <div className="bg-slate-950/60 border border-slate-800/50 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-indigo-400 text-xs">
                        {linkedAccount.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-semibold text-slate-200 truncate">@{linkedAccount.username}</p>
                        {linkedAccount.expiresAt && (
                          <span className="text-[9px] text-slate-500 font-semibold block uppercase">
                            Expires: {formatDate(linkedAccount.expiresAt)} UTC
                          </span>
                        )}
                      </div>
                    </div>

                    {plt.id === 'X' && (
                      <div className="flex items-center justify-between bg-cyan-950/20 border border-cyan-500/20 rounded-xl px-3 py-2 text-[10px]">
                        <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                          X Premium (25,000 Chars Limit)
                        </span>
                        <span className={`font-extrabold px-2 py-0.5 rounded-full uppercase ${
                          linkedAccount.isPremium ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {linkedAccount.isPremium ? 'ACTIVE' : 'STANDARD'}
                        </span>
                      </div>
                    )}

                    <button
                      onClick={() => handleDisconnect(linkedAccount.id, plt.name)}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-950 hover:bg-rose-950/10 border border-slate-800 hover:border-rose-900/30 text-slate-300 hover:text-rose-400 rounded-xl text-xs font-semibold transition-all duration-300 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <span className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Unlink className="h-3.5 w-3.5" />
                      )}
                      Disconnect Account
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect(plt.id)}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all duration-300 active:scale-95 shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Link2 className="h-3.5 w-3.5" />
                    )}
                    Connect Account
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
