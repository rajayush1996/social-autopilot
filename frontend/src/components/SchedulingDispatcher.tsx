'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  AlarmClock, 
  Calendar, 
  Clock, 
  Plus, 
  Play, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ToggleLeft, 
  ToggleRight, 
  Share2,
  Layers,
  ChevronRight,
  X,
  Zap,
  Info,
  Upload,
  FileText,
  Send,
  ListFilter,
  Maximize2,
  Minimize2
} from 'lucide-react';
import ApiService, { AutomationSchedule } from '@/services/apiService';
import { Post } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { formatDateTime } from '@/utils/date';
import LiquidUploadButton from '@/components/LiquidUploadButton';
import CarouselSlideDeck from '@/components/CarouselSlideDeck';

export interface MediaAssetItem {
  id: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
  assignedDay: string; // 'ANY', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'
  assignedPlatform: string; // 'ALL', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'X'
}

const DAYS_OF_WEEK = [
  { key: 'MON', label: 'M', full: 'Monday' },
  { key: 'TUE', label: 'T', full: 'Tuesday' },
  { key: 'WED', label: 'W', full: 'Wednesday' },
  { key: 'THU', label: 'T', full: 'Thursday' },
  { key: 'FRI', label: 'F', full: 'Friday' },
  { key: 'SAT', label: 'S', full: 'Saturday' },
  { key: 'SUN', label: 'S', full: 'Sunday' },
];

const PLATFORMS = [
  { id: 'LINKEDIN', label: 'LinkedIn', color: 'bg-blue-600/20 text-blue-400 border-blue-500/30' },
  { id: 'FACEBOOK', label: 'Facebook Page', color: 'bg-blue-600/20 text-blue-400 border-blue-500/30' },
  { id: 'INSTAGRAM', label: 'Instagram', color: 'bg-pink-600/20 text-pink-400 border-pink-500/30' },
  { id: 'X', label: 'X (Twitter)', color: 'bg-slate-700/30 text-slate-300 border-slate-600/40' },
];

const TONES = [
  { id: 'STORYTELLING', label: 'Storytelling (Case Study & Breakdown)' },
  { id: 'ENGAGING', label: 'Engaging & Viral' },
  { id: 'PROFESSIONAL', label: 'Professional Business' },
  { id: 'CASUAL', label: 'Casual & Friendly' },
  { id: 'PROMOTIONAL', label: 'Product Announcement' },
  { id: 'HUMOROUS', label: 'Humorous & Fun' },
];

export function SchedulingDispatcher() {
  const [schedules, setSchedules] = useState<AutomationSchedule[]>([]);
  const [dispatcherEnabled, setDispatcherEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  
  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<AutomationSchedule | null>(null);

  // Form Fields
  const [formName, setFormName] = useState<string>('Daily Autopilot Dispatch');
  const [formTime, setFormTime] = useState<string>('09:00');
  const [formDays, setFormDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);
  const [formRepeat, setFormRepeat] = useState<string>('WEEKLY');
  const [formPlatforms, setFormPlatforms] = useState<('INSTAGRAM' | 'LINKEDIN' | 'X' | 'FACEBOOK')[]>(['LINKEDIN', 'X', 'FACEBOOK']);
  const [formTone, setFormTone] = useState<string>('ENGAGING');
  const [formTopic, setFormTopic] = useState<string>('');
  const [formEmojiDensity, setFormEmojiDensity] = useState<string>('MEDIUM');
  const [formHashtagCount, setFormHashtagCount] = useState<string>('MODERATE');
  const [formFormatStyle, setFormFormatStyle] = useState<string>('SINGLE');
  const [formContentLength, setFormContentLength] = useState<string>('BALANCED');
  const [mediaFileUrl, setMediaFileUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO' | null>(null);
  const [mediaAssets, setMediaAssets] = useState<MediaAssetItem[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const [sampleDrafts, setSampleDrafts] = useState<Record<string, string> | null>(null);
  const [generatingSample, setGeneratingSample] = useState<boolean>(false);
  const [isEnhancingTopic, setIsEnhancingTopic] = useState<boolean>(false);
  const [isTopicExpanded, setIsTopicExpanded] = useState<boolean>(false);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);

  useEffect(() => {
    ApiService.getConnectedAccounts()
      .then((accs) => setConnectedPlatforms(accs.map((a) => a.platform.toUpperCase())))
      .catch(() => {});
  }, []);

  const toast = useToast();

  const handleEnhanceTopic = async () => {
    if (!formTopic || !formTopic.trim()) {
      toast.error('Please enter a topic or instruction first (e.g. "SaaS growth tips").');
      return;
    }
    setIsEnhancingTopic(true);
    try {
      const result = await ApiService.enhancePrompt(
        formTopic,
        formPlatforms[0] || 'GENERAL',
        formTone
      );
      if (result.enhancedPrompt) {
        setFormTopic(result.enhancedPrompt);
        toast.success('Auto-Pilot prompt magic-enhanced!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to enhance prompt.');
    } finally {
      setIsEnhancingTopic(false);
    }
  };

  const handlePreviewSampleAi = async () => {
    if (formPlatforms.length === 0) {
      toast.error('Please select at least one target platform.');
      return;
    }

    setGeneratingSample(true);
    try {
      const res: any = await ApiService.generateAiContent(
        formTopic || 'Daily business growth updates & AI productivity workflows',
        formTone,
        formPlatforms,
        {
          emojiDensity: formEmojiDensity,
          hashtagCount: formHashtagCount,
          formatStyle: formFormatStyle,
          contentLength: formContentLength,
        }
      );
      if (res) {
        const draftMap = res.adaptedPosts || res;
        setSampleDrafts({
          INSTAGRAM: draftMap.INSTAGRAM || res.INSTAGRAM || res.content || '',
          LINKEDIN: draftMap.LINKEDIN || res.LINKEDIN || res.content || '',
          X: draftMap.X || res.X || res.content || '',
          FACEBOOK: draftMap.FACEBOOK || res.FACEBOOK || res.content || '',
        });
        toast.success('Generated live sample AI post preview!');
      }
    } catch (err: any) {
      console.error('Failed to generate sample preview:', err);
      toast.error('Could not generate sample preview.');
    } finally {
      setGeneratingSample(false);
    }
  };

  // Posts Queue & Manager State
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsFilter, setPostsFilter] = useState<'ALL' | 'SCHEDULED' | 'DRAFT' | 'PUBLISHED'>('ALL');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostContent, setEditingPostContent] = useState<string>('');
  const [updatingPostId, setUpdatingPostId] = useState<string | null>(null);

  const fetchPostsData = async () => {
    try {
      const res = await ApiService.getPosts();
      setPosts(res || []);
    } catch (err: any) {
      console.error('Failed to load posts queue:', err);
    }
  };

  const handleTogglePostStatus = async (post: Post, newStatus: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED') => {
    setUpdatingPostId(post.id);
    try {
      await ApiService.updatePost(post.id, { status: newStatus as any });
      toast.success(`Post status changed to ${newStatus}`);
      await fetchPostsData();
    } catch (err: any) {
      console.error('Failed to update post status:', err);
      toast.error('Could not update post status.');
    } finally {
      setUpdatingPostId(null);
    }
  };

  const handleSavePostContent = async (postId: string) => {
    setUpdatingPostId(postId);
    try {
      await ApiService.updatePost(postId, { content: editingPostContent });
      toast.success('Post content saved!');
      setEditingPostId(null);
      await fetchPostsData();
    } catch (err: any) {
      console.error('Failed to save post content:', err);
      toast.error('Could not save post content.');
    } finally {
      setUpdatingPostId(null);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post from the queue?')) return;
    try {
      await ApiService.deletePost(postId);
      toast.success('Post removed from queue.');
      await fetchPostsData();
    } catch (err: any) {
      console.error('Failed to delete post:', err);
      toast.error('Failed to delete post.');
    }
  };

  const handlePublishPostNow = async (postId: string) => {
    setUpdatingPostId(postId);
    try {
      await ApiService.publishPost(postId);
      toast.success('Post published successfully to social channels!');
      await fetchPostsData();
    } catch (err: any) {
      console.error('Failed to publish post:', err);
      toast.error('Failed to publish post.');
    } finally {
      setUpdatingPostId(null);
    }
  };

  const fetchSchedulesData = async () => {
    try {
      const res = await ApiService.getUserSchedules();
      setDispatcherEnabled(res.dispatcherEnabled);
      setSchedules(res.schedules);
    } catch (err: any) {
      console.error('Failed to load automation schedules:', err);
      toast.error('Failed to fetch scheduling dispatcher settings.');
    } finally {
      setLoading(false);
    }
  };

  const [portalMounted, setPortalMounted] = useState<boolean>(false);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    if (isModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  useEffect(() => {
    fetchSchedulesData();
    fetchPostsData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingSchedule(null);
    setFormName('Daily Growth Dispatcher');
    setFormTime('09:00');
    setFormDays(['MON', 'TUE', 'WED', 'THU', 'FRI']);
    setFormRepeat('WEEKLY');
    setFormPlatforms(['LINKEDIN', 'X', 'FACEBOOK', 'INSTAGRAM']);
    setFormTone('ENGAGING');
    setFormTopic('');
    setFormEmojiDensity('MEDIUM');
    setFormHashtagCount('MODERATE');
    setFormFormatStyle('SINGLE');
    setFormContentLength('BALANCED');
    setMediaFileUrl('');
    setMediaType(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sched: AutomationSchedule) => {
    setEditingSchedule(sched);
    setFormName(sched.name);
    setFormTime(sched.timeOfDay || '09:00');
    setFormDays(sched.daysOfWeek || ['MON', 'TUE', 'WED', 'THU', 'FRI']);
    setFormRepeat(sched.repeatType || 'WEEKLY');
    setFormPlatforms((sched.targetPlatforms as ('INSTAGRAM' | 'LINKEDIN' | 'X' | 'FACEBOOK')[]) || ['LINKEDIN', 'X', 'FACEBOOK', 'INSTAGRAM']);
    setFormTone(sched.tone || 'ENGAGING');
    setFormTopic(sched.topicPrompt || '');
    setFormEmojiDensity('MEDIUM');
    setFormHashtagCount('MODERATE');
    setFormFormatStyle('SINGLE');
    setFormContentLength('BALANCED');
    setMediaFileUrl('');
    setMediaType(null);
    setIsModalOpen(true);
  };

  const handleToggleDay = (dayKey: string) => {
    if (formDays.includes(dayKey)) {
      if (formDays.length === 1) {
        toast.error('Select at least one active day.');
        return;
      }
      setFormDays(formDays.filter(d => d !== dayKey));
    } else {
      setFormDays([...formDays, dayKey]);
    }
  };

  const handleTogglePlatform = (platId: 'INSTAGRAM' | 'LINKEDIN' | 'X' | 'FACEBOOK') => {
    if (formPlatforms.includes(platId)) {
      if (formPlatforms.length === 1) {
        toast.error('Select at least one target platform.');
        return;
      }
      setFormPlatforms(formPlatforms.filter(p => p !== platId));
    } else {
      setFormPlatforms([...formPlatforms, platId]);
    }
  };

  const handleToggleActiveSwitch = async (sched: AutomationSchedule) => {
    setTogglingId(sched.id);
    try {
      const updated = await ApiService.toggleSchedule(sched.id, !sched.isActive);
      setSchedules(prev => prev.map(s => s.id === sched.id ? updated : s));
      toast.success(`Schedule "${sched.name}" ${updated.isActive ? 'enabled' : 'paused'}.`);
    } catch (err: any) {
      console.error('Failed to toggle schedule:', err);
      toast.error('Could not change schedule state.');
    } finally {
      setTogglingId(null);
    }
  };

  const getLocalBrowserTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
    } catch (e) {
      return 'UTC';
    }
  };

  const [formTimezone, setFormTimezone] = useState<string>(getLocalBrowserTimezone());

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formName.trim() || 'Daily Auto-Post',
        timeOfDay: formTime,
        timezone: formTimezone || getLocalBrowserTimezone(),
        daysOfWeek: formDays,
        repeatType: formRepeat,
        targetPlatforms: formPlatforms,
        tone: formTone,
        topicPrompt: formTopic.trim(),
        isActive: editingSchedule ? editingSchedule.isActive : true,
      };

      if (editingSchedule) {
        const updated = await ApiService.updateSchedule(editingSchedule.id, payload);
        setSchedules(prev => prev.map(s => s.id === editingSchedule.id ? { ...updated, lastRunAt: undefined } : s));
        toast.success('Schedule updated successfully! Ready for test run.');
      } else {
        const created = await ApiService.createSchedule(payload);
        setSchedules(prev => [created, ...prev]);
        toast.success('New recurring schedule created!');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save schedule:', err);
      toast.error(err.response?.data?.message || 'Failed to save automation schedule.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await ApiService.deleteSchedule(id);
      setSchedules(prev => prev.filter(s => s.id !== id));
      toast.success('Schedule deleted.');
    } catch (err: any) {
      console.error('Failed to delete schedule:', err);
      toast.error('Failed to delete schedule.');
    }
  };

  const handleRunNow = async (sched: AutomationSchedule) => {
    setRunningId(sched.id);
    try {
      // Check if there is already a SCHEDULED pending post in the queue
      const existingPendingPost = posts.find((p) => p.status === 'SCHEDULED');
      const updateTargetId = existingPendingPost ? existingPendingPost.id : undefined;

      await ApiService.runScheduleNow(sched.id, updateTargetId);
      setSchedules(prev => prev.map(s => s.id === sched.id ? { ...s, lastRunAt: new Date().toISOString() } : s));
      
      toast.success(
        updateTargetId
          ? `✨ Refreshed pending post for "${sched.name}" with new AI content!`
          : `🚀 Dispatched schedule "${sched.name}"! Post queued in Posts page.`
      );
      fetchSchedulesData();
      fetchPostsData();
    } catch (err: any) {
      console.error('Failed to trigger schedule:', err);
      toast.error(err.response?.data?.message || 'Failed to trigger schedule dispatch.');
    } finally {
      setRunningId(null);
    }
  };

  // Helper to format time in 24-Hour standard format (e.g. 09:00, 14:30, 21:00)
  const formatTimeDisplay = (time24: string) => {
    if (!time24) return '09:00';
    const [hStr, mStr] = time24.split(':');
    const h = (parseInt(hStr, 10) || 0).toString().padStart(2, '0');
    const m = (mStr || '00').padStart(2, '0');
    return `${h}:${m}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Loading Automation Dispatcher...</p>
      </div>
    );
  }

  if (!dispatcherEnabled) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-8 text-center space-y-4 max-w-2xl mx-auto my-6 animate-fadeIn">
        <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
          <Info className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-100">Auto-Pilot Schedule Disabled</h3>
        <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
          The Recurring Auto-Pilot feature is currently turned OFF by system administration. Please contact your admin or check the Admin Control Center to enable master dispatching.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
            Active Automation Rules ({schedules.length})
          </span>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Schedule</span>
        </button>
      </div>

      {/* Schedule Cards Grid */}
      {schedules.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-800/60 border-dashed rounded-3xl p-12 text-center space-y-4">
          <div className="w-14 h-14 bg-indigo-950/50 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto border border-indigo-800/40">
            <AlarmClock className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-200">No Auto-Pilot Schedules Created</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create your first schedule to automatically generate and queue AI social media posts on selected days.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            + Create Auto-Pilot Schedule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((sched) => {
            const isToggling = togglingId === sched.id;
            const isRunning = runningId === sched.id;

            return (
              <div
                key={sched.id}
                className={`group bg-slate-900/70 border rounded-2xl p-4 backdrop-blur-md transition-all duration-300 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-indigo-500/40 shadow-lg ${
                  sched.isActive
                    ? 'border-indigo-500/30 shadow-indigo-955/20'
                    : 'border-slate-800 opacity-75 hover:opacity-100'
                }`}
              >
                {/* Left Column: Schedule Name & Topic */}
                <div className="flex items-center gap-3.5 min-w-[240px]">
                  <div className={`p-2.5 rounded-xl border shrink-0 ${
                    sched.isActive ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400' : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}>
                    <AlarmClock className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-100 group-hover:text-indigo-300 transition-colors">
                        {sched.name}
                      </h3>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.2 rounded-full border ${
                        sched.isActive
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {sched.isActive ? '🚀 Active' : '📝 Paused'}
                      </span>
                    </div>
                    {sched.topicPrompt ? (
                      <p className="text-[11px] text-slate-400 line-clamp-1 italic max-w-xs">
                        "{sched.topicPrompt}"
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 font-mono">No specific topic prompt</p>
                    )}
                  </div>
                </div>

                {/* Center-Left Column: Dispatch Time */}
                <div className="flex items-center gap-2 bg-slate-955 border border-slate-800 px-3 py-1.5 rounded-xl shrink-0">
                  <Clock className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="font-mono text-xs font-black text-slate-200">
                    {formatTimeDisplay(sched.timeOfDay)}
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase font-bold px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800">
                    {sched.repeatType || 'WEEKLY'}
                  </span>
                </div>

                {/* Center Column: Dispatch Days Pills */}
                <div className="flex items-center gap-1 shrink-0">
                  {DAYS_OF_WEEK.map((d) => {
                    const isActiveDay = sched.daysOfWeek?.includes(d.key);
                    return (
                      <span
                        key={d.key}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                          isActiveDay
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-955 text-slate-400 border border-slate-850'
                        }`}
                        title={d.full}
                      >
                        {d.label}
                      </span>
                    );
                  })}
                </div>

                {/* Center-Right Column: Target Platforms */}
                <div className="flex items-center gap-1 shrink-0">
                  {sched.targetPlatforms?.map((p) => (
                    <span
                      key={p}
                      className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-955 text-slate-300 border border-slate-800"
                    >
                      {p}
                    </span>
                  ))}
                </div>

                {/* Last Execution Status Badge */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {sched.lastRunAt ? (
                    <a
                      href="/posts"
                      className="text-[10px] font-extrabold px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 hover:bg-emerald-500/20 transition-all cursor-pointer"
                      title="Click to view queued post on Posts page"
                    >
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      <span>Dispatched ({formatDateTime(sched.lastRunAt)})</span>
                    </a>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 px-2.5 py-1 rounded-xl bg-slate-955 border border-slate-800">
                      Ready for Dispatch
                    </span>
                  )}
                </div>

                {/* Right Column: Actions & Toggle */}
                <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 border-slate-800 pt-2 lg:pt-0">
                  <button
                    onClick={() => handleToggleActiveSwitch(sched)}
                    disabled={isToggling}
                    title={sched.isActive ? 'Pause Schedule' : 'Activate Schedule'}
                    className="focus:outline-none transition-transform active:scale-95 text-indigo-400 disabled:opacity-50 cursor-pointer mr-1"
                  >
                    {sched.isActive ? (
                      <ToggleRight className="h-7 w-7 text-indigo-500" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-slate-600" />
                    )}
                  </button>

                  {/* Run button - Hidden once published/dispatched until edited */}
                  {!sched.lastRunAt && (
                    <button
                      onClick={() => handleRunNow(sched)}
                      disabled={isRunning}
                      title="Run Schedule Dispatcher Now"
                      className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer animate-fadeIn"
                    >
                      {isRunning ? (
                        <span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      <span className="hidden sm:inline text-[11px]">Run</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenEditModal(sched)}
                    title="Edit Schedule Settings"
                    className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteSchedule(sched.id, sched.name)}
                    title="Delete Schedule"
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT SCHEDULE MODAL (PORTAL TO DOCUMENT.BODY) */}
      {isModalOpen && portalMounted && createPortal(
        <div className="fixed inset-0 z-[99990] bg-slate-955/85 backdrop-blur-2xl flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-fadeIn pointer-events-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-[96vw] xl:max-w-[1550px] w-full p-6 sm:p-8 md:p-10 shadow-2xl space-y-6 relative my-auto border-indigo-500/20 max-h-[94vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-850 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
                  <AlarmClock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-100">
                    {editingSchedule ? 'Edit Auto-Pilot Schedule' : 'New Auto-Pilot Schedule Studio'}
                  </h3>
                  <p className="text-xs text-slate-400">Configure recurring days, dispatch times, target channels, and live AI feed previews</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  disabled={saving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving Schedule...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      {editingSchedule ? 'Save Schedule' : 'Create Auto-Pilot'}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2.5 bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-white rounded-2xl transition-all border border-slate-700 cursor-pointer"
                  title="Close modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ULTRA-WIDE 2-COLUMN STUDIO GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10 items-start overflow-y-auto pr-1.5 custom-scrollbar shrink">
              {/* LEFT COLUMN: Clean Controls (5 cols) */}
              <div className="lg:col-span-5 space-y-5">
                {/* Schedule Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Schedule Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Daily Growth Autopilot"
                    className="w-full bg-slate-955 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                {/* Timing & Repeat Mode */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                        Execution Time (24h)
                      </label>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full" title="Detected Local Browser Timezone">
                        🌐 {formTimezone}
                      </span>
                    </div>
                    <input
                      type="time"
                      required
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Schedule Mode
                    </label>
                    <select
                      value={formRepeat}
                      onChange={(e) => setFormRepeat(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="WEEKLY" className="bg-slate-900 text-slate-100">Repeat Weekly (Recurring)</option>
                      <option value="ONCE" className="bg-slate-900 text-slate-100">Run Once (Single Batch)</option>
                    </select>
                  </div>
                </div>

                {/* Dispatch Days with Quick Presets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Dispatch Days
                    </label>

                    {/* Presets */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFormDays(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])}
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20 cursor-pointer"
                      >
                        All Days
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormDays(['MON', 'TUE', 'WED', 'THU', 'FRI'])}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-200 bg-slate-850 px-2 py-0.5 rounded-lg cursor-pointer"
                      >
                        Weekdays
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormDays(['SAT', 'SUN'])}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-200 bg-slate-850 px-2 py-0.5 rounded-lg cursor-pointer"
                      >
                        Weekends
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {DAYS_OF_WEEK.map((d) => {
                      const isSelected = formDays.includes(d.key);
                      return (
                        <button
                          type="button"
                          key={d.key}
                          onClick={() => handleToggleDay(d.key)}
                          className={`py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40 border border-indigo-400'
                              : 'bg-slate-955 text-slate-500 border border-slate-850 hover:text-slate-300'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Target Channels */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Target Channels
                    </label>
                    <a href="/accounts" className="text-[10px] text-indigo-400 hover:underline font-semibold flex items-center gap-1">
                      Connect Accounts <ChevronRight className="h-3 w-3" />
                    </a>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {PLATFORMS.map((p) => {
                      const isSelected = formPlatforms.includes(p.id as any);
                      const isConnected = connectedPlatforms.includes(p.id);

                      return (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => handleTogglePlatform(p.id as any)}
                          className={`py-2.5 px-3 rounded-2xl font-bold text-xs transition-all duration-300 flex items-center justify-between gap-2 border cursor-pointer ${
                            isSelected
                              ? isConnected
                                ? 'bg-indigo-600/25 text-indigo-200 border-indigo-500/50 shadow-md shadow-indigo-950/40'
                                : 'bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-sm'
                              : 'bg-slate-955 text-slate-500 border border-slate-850 hover:border-slate-750 hover:text-slate-300'
                          }`}
                          title={
                            isConnected
                              ? `${p.label} Connected & Ready`
                              : `${p.label} Not Connected - Click to connect account`
                          }
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                isSelected
                                  ? isConnected
                                    ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/80'
                                    : 'bg-rose-500 animate-pulse shadow-sm shadow-rose-500/80'
                                  : 'bg-slate-700'
                              }`}
                            />
                            <span className="truncate">{p.label}</span>
                          </div>

                          {isSelected && isConnected && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Multi-Media Asset Attachment Matrix */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider block flex items-center gap-1.5">
                      <Upload className="h-3.5 w-3.5" />
                      Multi-Media Asset Matrix ({mediaAssets.length} Uploaded)
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">Map specific media to Days or Platforms</span>
                  </div>

                  <LiquidUploadButton
                    multiMode={true}
                    currentMediaUrl=""
                    currentMediaType={null}
                    onMediaSelect={(previewUrl, type) => {
                      setMediaAssets((prev) => {
                        if (prev.some((m) => m.url === previewUrl)) return prev;
                        return [
                          ...prev,
                          {
                            id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                            url: previewUrl,
                            type: type || 'IMAGE',
                            assignedDay: 'ANY',
                            assignedPlatform: 'ALL',
                          },
                        ];
                      });
                    }}
                    onUploadSuccess={(url, type) => {
                      setMediaAssets((prev) => {
                        // Upgrade temporary blob preview URL to final server URL or prevent duplicate
                        const blobIndex = prev.findIndex((m) => m.url.startsWith('blob:'));
                        if (blobIndex >= 0) {
                          const updated = [...prev];
                          updated[blobIndex] = { ...updated[blobIndex], url, type: type || 'IMAGE' };
                          return updated;
                        }
                        if (prev.some((m) => m.url === url)) return prev;
                        return [
                          ...prev,
                          {
                            id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                            url: url,
                            type: type || 'IMAGE',
                            assignedDay: 'ANY',
                            assignedPlatform: 'ALL',
                          },
                        ];
                      });
                    }}
                    onRemove={() => {}}
                  />

                  {/* Multi-Media Mapping List */}
                  {mediaAssets.length > 0 && (
                    <div className="space-y-2 pt-2 animate-fadeIn max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                      {mediaAssets.map((asset) => (
                        <div key={asset.id} className="bg-slate-955 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-md transition-all hover:border-slate-750">
                          {/* Left: Thumbnail */}
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0 flex items-center justify-center">
                            {asset.type === 'VIDEO' ? (
                              <video src={asset.url} className="w-full h-full object-cover" />
                            ) : (
                              <img src={asset.url} alt="Media thumbnail" className="w-full h-full object-cover" />
                            )}
                          </div>

                          {/* Middle: 2 Clean, Distinct Dropdown Controls */}
                          <div className="grid grid-cols-2 gap-2 flex-1 max-w-sm">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Day</span>
                              <select
                                value={asset.assignedDay}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMediaAssets((prev) => prev.map((m) => m.id === asset.id ? { ...m, assignedDay: val } : m));
                                }}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                              >
                                <option value="ANY" className="bg-slate-900 text-slate-100">Any Day (Default)</option>
                                <option value="MON" className="bg-slate-900 text-slate-100">Monday</option>
                                <option value="TUE" className="bg-slate-900 text-slate-100">Tuesday</option>
                                <option value="WED" className="bg-slate-900 text-slate-100">Wednesday</option>
                                <option value="THU" className="bg-slate-900 text-slate-100">Thursday</option>
                                <option value="FRI" className="bg-slate-900 text-slate-100">Friday</option>
                                <option value="SAT" className="bg-slate-900 text-slate-100">Saturday</option>
                                <option value="SUN" className="bg-slate-900 text-slate-100">Sunday</option>
                              </select>
                            </div>

                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Platform</span>
                              <select
                                value={asset.assignedPlatform}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMediaAssets((prev) => prev.map((m) => m.id === asset.id ? { ...m, assignedPlatform: val } : m));
                                }}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                              >
                                <option value="ALL" className="bg-slate-900 text-slate-100">All Platforms</option>
                                <option value="LINKEDIN" className="bg-slate-900 text-slate-100">LinkedIn Only</option>
                                <option value="FACEBOOK" className="bg-slate-900 text-slate-100">Facebook Only</option>
                                <option value="INSTAGRAM" className="bg-slate-900 text-slate-100">Instagram Only</option>
                                <option value="X" className="bg-slate-900 text-slate-100">X (Twitter) Only</option>
                              </select>
                            </div>
                          </div>

                          {/* Right: Close / Remove Cross Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setMediaAssets((prev) => prev.filter((m) => m.id !== asset.id));
                              toast.success('Media asset and assignment removed.');
                            }}
                            className="p-2 bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-800 hover:border-rose-500/30 transition-all shrink-0 cursor-pointer"
                            title="Remove media and assigned options"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Topic Instructions & Magic Enhancer */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                      Topic & Niche Instructions
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsTopicExpanded(true)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-indigo-300 bg-slate-900 hover:bg-slate-850 border border-slate-800 px-2 py-0.5 rounded-lg transition-all cursor-pointer"
                      title="Expand to Full Screen View"
                    >
                      <Maximize2 className="h-3 w-3" />
                      Full View
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    placeholder="e.g. Share software growth tips, SaaS architecture insights, and productivity automation lessons."
                    className="w-full bg-slate-955 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-all resize-none leading-relaxed"
                  />

                  {/* Magic Enhance Prompt Button */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleEnhanceTopic}
                      disabled={isEnhancingTopic || !formTopic.trim()}
                      className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-sm cursor-pointer"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isEnhancingTopic ? 'animate-spin' : ''}`} />
                      {isEnhancingTopic ? 'Enhancing Prompt...' : '✨ Magic Enhance Prompt'}
                    </button>
                    <span className="text-[10px] text-slate-500">Auto-optimizes prompt for schedule</span>
                  </div>
                </div>

                {/* Advanced Controls Accordion / Controls */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-855">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">AI Tone</label>
                    <select
                      value={formTone}
                      onChange={(e) => setFormTone(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 text-[11px] focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      {TONES.map((t) => (
                        <option key={t.id} value={t.id} className="bg-slate-900 text-slate-100">{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Format Style</label>
                    <select
                      value={formFormatStyle}
                      onChange={(e) => setFormFormatStyle(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 text-[11px] focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      <option value="SINGLE" className="bg-slate-900 text-slate-100">Standard Post</option>
                      <option value="THREAD" className="bg-slate-900 text-slate-100">Numbered Thread (1/ 2/)</option>
                      <option value="CAROUSEL" className="bg-slate-900 text-slate-100">Carousel Outline</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Emoji Density</label>
                    <select
                      value={formEmojiDensity}
                      onChange={(e) => setFormEmojiDensity(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 text-[11px] focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      <option value="NONE" className="bg-slate-900 text-slate-100">None (0 Emojis)</option>
                      <option value="LOW" className="bg-slate-900 text-slate-100">Subtle (1-2 Emojis)</option>
                      <option value="MEDIUM" className="bg-slate-900 text-slate-100">Balanced (3-5 Emojis)</option>
                      <option value="HIGH" className="bg-slate-900 text-slate-100">Vibrant (Heavy Emojis)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Char Length (Body)</label>
                    <select
                      value={formContentLength}
                      onChange={(e) => setFormContentLength(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 text-[11px] focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      <option value="CONCISE" className="bg-slate-900 text-slate-100">Concise (~100-300 chars)</option>
                      <option value="BALANCED" className="bg-slate-900 text-slate-100">Balanced (~400-1000 chars)</option>
                      <option value="DETAILED" className="bg-slate-900 text-slate-100">Detailed (~1000-2500 chars)</option>
                      <option value="LONG_FORM" className="bg-slate-900 text-slate-100">Long-Form Story (~3000-6000 chars)</option>
                    </select>
                  </div>

                  <div className="col-span-2 space-y-1 pt-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Hashtags</label>
                    <select
                      value={formHashtagCount}
                      onChange={(e) => setFormHashtagCount(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 text-[11px] focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      <option value="NONE" className="bg-slate-900 text-slate-100">0 Tags (No Hashtags)</option>
                      <option value="FEW_3" className="bg-slate-900 text-slate-100">3 Tags (Minimal Focus)</option>
                      <option value="MODERATE_5" className="bg-slate-900 text-slate-100">5 Tags (Standard Reach)</option>
                      <option value="GROWTH_8" className="bg-slate-900 text-slate-100">8 Tags (Growth Boost)</option>
                      <option value="VIRAL_12" className="bg-slate-900 text-slate-100">12 Tags (Viral Maximum)</option>
                    </select>
                  </div>
                </div>

                {/* GENERATE SAMPLE SEED BUTTON (Placed BELOW Selection Controls) */}
                <button
                  type="button"
                  onClick={handlePreviewSampleAi}
                  disabled={generatingSample || formPlatforms.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-indigo-950/40 cursor-pointer"
                >
                  {generatingSample ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating AI Seed Previews...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 text-amber-300" />
                      Generate Sample AI Post Preview
                    </>
                  )}
                </button>
              </div>

              {/* RIGHT COLUMN: Live Social Feed Preview Cards (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-400" />
                    Live Feed Mockup Previews
                  </h4>
                  <span className="text-[10px] text-indigo-300 font-extrabold px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30">
                    {formPlatforms.length} Channels Active
                  </span>
                </div>

                {!sampleDrafts ? (
                  <div className="bg-slate-955/60 border border-slate-850 border-dashed rounded-3xl p-12 text-center space-y-3">
                    <Zap className="h-10 w-10 text-indigo-400 mx-auto animate-bounce" />
                    <h5 className="text-sm font-bold text-slate-200">No Sample AI Post Generated Yet</h5>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Click <strong className="text-indigo-300 font-semibold">"Generate Sample AI Post Preview"</strong> on the left to see realistic live mockups for LinkedIn, Facebook, Instagram, and X!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 max-h-[680px] overflow-y-auto pr-1.5 custom-scrollbar animate-fadeIn">
                    {formPlatforms.map((plat) => {
                      const text = sampleDrafts[plat] || '';
                      // Find assigned media asset for this platform
                      const matchedMedia = mediaAssets.find(m => m.assignedPlatform === plat) || mediaAssets[0];
                      const activeMediaUrl = matchedMedia ? matchedMedia.url : mediaFileUrl;
                      const activeMediaType = matchedMedia ? matchedMedia.type : mediaType;

                      return (
                        <div key={plat} className="bg-slate-955 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 backdrop-blur-md flex flex-col justify-between">
                          <div className="space-y-3">
                            {/* Card Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                                  <Share2 className="h-4.5 w-4.5" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                                    Your Brand Profile
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-mono uppercase">{plat} Live Feed Mockup</p>
                                </div>
                              </div>

                              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl bg-slate-900 text-slate-400 border border-slate-800">
                                {text.length} chars
                              </span>
                            </div>

                            {/* Editable Post Body or Carousel Deck Render */}
                            {formFormatStyle === 'CAROUSEL' || (text && /(?:SLIDE|Slide)\s*\d+/i.test(text)) ? (
                              <CarouselSlideDeck
                                text={text}
                                onTextChange={(val) => setSampleDrafts((prev) => ({ ...(prev || {}), [plat]: val }))}
                                platformLabel={plat}
                              />
                            ) : (
                              <textarea
                                value={text}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSampleDrafts((prev) => ({ ...(prev || {}), [plat]: val }));
                                }}
                                rows={7}
                                className="w-full bg-slate-900/60 border border-slate-850 rounded-2xl p-3.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 leading-relaxed resize-y font-sans placeholder:text-slate-600"
                                placeholder={`Generated text for ${plat} will appear here...`}
                              />
                            )}
                          </div>

                          {/* Attached Media Display */}
                          {activeMediaUrl && (
                            <div className="rounded-2xl overflow-hidden border border-slate-850 max-h-56 bg-slate-900 flex items-center justify-center p-1 shadow-md mt-2">
                              {activeMediaType === 'VIDEO' ? (
                                <video src={activeMediaUrl} controls className="w-full max-h-52 object-contain rounded-xl" />
                              ) : (
                                <img
                                  src={activeMediaUrl}
                                  alt="Attached Media Preview"
                                  className="w-full max-h-52 object-cover rounded-xl"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800';
                                  }}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* FULL SCREEN EXPANDED TOPIC MODAL OVERLAY (HIGHEST Z-INDEX ON TOP OF MAIN MODAL) */}
      {isTopicExpanded && createPortal(
        <div className="fixed inset-0 z-[9999999] bg-slate-955/90 backdrop-blur-2xl flex items-center justify-center p-4 md:p-8 animate-fadeIn">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-955">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">Full Screen Topic & Niche Instructions</h3>
                  <p className="text-xs text-slate-400">Write or review detailed instructions for your Auto-Pilot schedule</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleEnhanceTopic}
                  disabled={isEnhancingTopic || !formTopic.trim()}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-3 py-2 rounded-xl transition-all disabled:opacity-40 cursor-pointer"
                >
                  <Sparkles className={`w-4 h-4 ${isEnhancingTopic ? 'animate-spin' : ''}`} />
                  {isEnhancingTopic ? 'Enhancing...' : '✨ Magic Enhance'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsTopicExpanded(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 transition-colors cursor-pointer"
                  title="Close Full View"
                >
                  <Minimize2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Textarea */}
            <div className="p-6 flex-1 flex flex-col bg-slate-955">
              <textarea
                value={formTopic}
                onChange={(e) => setFormTopic(e.target.value)}
                placeholder="Type your full, detailed topic instructions, niche details, target audience preferences, and guidelines here..."
                className="w-full flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-all resize-none leading-relaxed font-sans placeholder:text-slate-600 min-h-[350px]"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900">
              <span className="text-xs text-slate-400 font-mono">Character count: {formTopic.length}</span>
              <button
                type="button"
                onClick={() => setIsTopicExpanded(false)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
              >
                Done / Close View
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default SchedulingDispatcher;
