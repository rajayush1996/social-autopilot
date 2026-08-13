'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Sparkles, Plus, Calendar, Layers, ShieldCheck } from 'lucide-react';
import ApiService from '@/services/apiService';
import { Post, SocialAccount, User } from '@/lib/api';
import DashboardWidgets from '@/components/DashboardWidgets';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [profile, linkedAccounts, postsList] = await Promise.all([
        ApiService.getMe(),
        ApiService.getConnectedAccounts(),
        ApiService.getPosts(),
      ]);

      setUser(profile);
      setAccounts(linkedAccounts);
      setPosts(postsList);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncScheduler = async () => {
    setSyncing(true);
    try {
      await ApiService.triggerSchedulerSync();
      const postsList = await ApiService.getPosts();
      setPosts(postsList);
    } catch (err) {
      console.error('Failed to sync scheduler:', err);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 pb-12 animate-fadeIn max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center pb-6 border-b border-[var(--border-color)]">
          <div className="space-y-2">
            <div className="h-4 w-32 skeleton-shimmer" />
            <div className="h-8 w-64 skeleton-shimmer" />
          </div>
          <div className="h-10 w-36 skeleton-shimmer" />
        </div>

        {/* 4 KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 skeleton-shimmer" />
          ))}
        </div>

        {/* Analytics & Feed Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="h-72 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 skeleton-shimmer" />
            <div className="h-60 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 skeleton-shimmer" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="h-60 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 skeleton-shimmer" />
            <div className="h-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 skeleton-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-fadeIn max-w-7xl mx-auto">
      {/* Top Telemetry Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[var(--border-color)]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Dashboard
            </h1>
            <span className="bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/25 text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Live Console
            </span>
          </div>
          <p className="text-[var(--text-secondary)] text-sm mt-1 font-medium">
            Overview of your multi-channel social pipeline, performance analytics, and automated schedules.
          </p>
        </div>

        {/* Actions Bar (Sync Queue & Create Post) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSyncScheduler}
            disabled={syncing}
            className="h-10 px-4 rounded-xl bg-[var(--bg-input)] hover:bg-[#2563EB]/10 text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[#2563EB]/30 text-xs font-extrabold transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>Sync Queue</span>
          </button>

          <Link
            href="/composer"
            className="h-10 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-extrabold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>Create AI Post</span>
          </Link>
        </div>
      </div>

      {/* Essential Top-Tier Dashboard Widgets */}
      <DashboardWidgets 
        user={user} 
        posts={posts} 
        accounts={accounts} 
        onRefreshData={fetchDashboardData} 
      />
    </div>
  );
}
