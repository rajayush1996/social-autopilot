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
  Sparkles, 
  ToggleLeft, 
  ToggleRight, 
  Layers,
  X,
  Zap,
  Info,
  Maximize2,
  Minimize2,
  Wand2,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  Moon,
  Sun
} from 'lucide-react';
import ApiService, { AutomationSchedule } from '@/services/apiService';
import { Post } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import PlatformIcon from '@/components/PlatformIcon';
import { getReviewPipelineNarrative, formatTimeDisplay } from '@/utils/date';

export interface MediaAssetItem {
  id: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
  assignedDay: string;
  assignedPlatform: string;
}

const TONES = [
  { id: 'ENGAGING', label: 'Engaging & Viral' },
  { id: 'PROFESSIONAL', label: 'Professional Business' },
  { id: 'STORYTELLING', label: 'Storytelling (Case Study)' },
  { id: 'CASUAL', label: 'Casual & Friendly' },
  { id: 'PROMOTIONAL', label: 'Product Announcement' },
  { id: 'HUMOROUS', label: 'Humorous & Fun' },
];

// 🌟 AI CREATIVE STUDIO (With Empty State Logic)
export function CampaignCreativeStudio({ 
  onImageClick,
  onDurationChange,
  campaignTopic = '',
  assets,
  onAssetsUpdate
}: { 
  onImageClick: (url: string, title: string) => void; 
  onDurationChange?: (days: number) => void;
  campaignTopic?: string;
  assets: Array<{ day: number; url: string; prompt: string }>;
  onAssetsUpdate: (assets: Array<{ day: number; url: string; prompt: string }>) => void;
}) {
  const [generationType, setGenerationType] = useState<'SINGLE' | 'BATCH'>('BATCH');
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [visualStyle, setVisualStyle] = useState('3D_SAAS');
  const [selectedDays, setSelectedDays] = useState<number>(15);
  const [customVisualPrompt, setCustomVisualPrompt] = useState<string>('');

  const handleGenerate = () => {
    setGeneratingBatch(true);
    
    // Simulating API Call for Image Generation
    setTimeout(() => {
      if (generationType === 'BATCH') {
        const newAssets = Array.from({ length: selectedDays }).map((_, i) => ({
          day: i + 1,
          url: `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60&sig=${Math.random()}`,
          prompt: campaignTopic || `Day ${i + 1} creative`
        }));
        onAssetsUpdate(newAssets);
      } else {
        onAssetsUpdate([{
          day: 1,
          url: `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60&sig=${Math.random()}`,
          prompt: campaignTopic || 'Single creative'
        }]);
      }
      setGeneratingBatch(false);
    }, generationType === 'BATCH' ? 3000 : 1500);
  };

  const scrollSlider = (direction: 'left' | 'right') => {
    const container = document.getElementById('creative-slider-container');
    if (container) {
      const scrollAmount = direction === 'left' ? -container.clientWidth : container.clientWidth;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-3 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-4 shadow-inner">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-[#2563EB] rounded-xl">
            <Wand2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-[var(--text-primary)] uppercase tracking-wider">AI Visual Generator Engine</h4>
            <p className="text-[11px] text-[var(--text-secondary)]">Batch visuals synchronized with your topic</p>
          </div>
        </div>
        
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generatingBatch}
          className="px-3.5 py-2 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {generatingBatch ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {generatingBatch ? 'Processing...' : (generationType === 'BATCH' ? `Generate ${selectedDays}-Day Batch` : 'Generate Single')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">Visual Context Prompt</label>
          <input
            type="text"
            value={customVisualPrompt}
            onChange={(e) => setCustomVisualPrompt(e.target.value)}
            placeholder="e.g. Minimalist tech mockup..."
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#2563EB]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">Art Style</label>
          <select value={visualStyle} onChange={(e) => setVisualStyle(e.target.value)} className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] font-medium">
            <option value="3D_SAAS">3D SaaS Render</option>
            <option value="CORPORATE">Clean Corporate</option>
            <option value="VECTOR">Minimalist Vector</option>
            <option value="CYBERPUNK">Cyberpunk Tech</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => setGenerationType('SINGLE')}
            className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              generationType === 'SINGLE' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-[var(--text-secondary)]'
            }`}
          >
            🖼️ Single Image
          </button>
          <button
            type="button"
            onClick={() => setGenerationType('BATCH')}
            className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              generationType === 'BATCH' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-[var(--text-secondary)]'
            }`}
          >
            ⚡ Campaign Batch
          </button>
        </div>

        {generationType === 'BATCH' && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Days:</span>
            {[7, 15, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => { setSelectedDays(d); if (onDurationChange) onDurationChange(d); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all border cursor-pointer ${
                  selectedDays === d ? 'bg-blue-50 dark:bg-blue-900/30 text-[#2563EB] border-blue-300' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)]'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 🌟 EMPTY STATE LOGIC (Pehle koi image nahi dikhegi) */}
      {assets.length === 0 ? (
        <div className="h-28 w-full bg-[var(--bg-card)] border border-dashed border-[var(--border-color)] rounded-xl flex flex-col items-center justify-center space-y-1.5 mt-2">
          <div className="p-2 bg-[var(--bg-input)] rounded-full border border-[var(--border-color)]">
            <ImageIcon className="w-5 h-5 text-[var(--text-secondary)] opacity-70" />
          </div>
          <p className="text-[11px] font-extrabold text-[var(--text-primary)]">No Visuals Generated Yet</p>
          <p className="text-[9px] text-[var(--text-secondary)]">Click the Generate button above to create AI images</p>
        </div>
      ) : generationType === 'BATCH' ? (
        <div className="relative group/slider pt-1">
          <button 
            type="button"
            onClick={() => scrollSlider('left')}
            className="absolute -left-3 top-[50%] -translate-y-[50%] z-10 p-2 bg-[var(--bg-card)] hover:bg-[#2563EB] hover:text-white border border-[var(--border-color)] rounded-full text-[var(--text-primary)] shadow-md transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            type="button"
            onClick={() => scrollSlider('right')}
            className="absolute -right-3 top-[50%] -translate-y-[50%] z-10 p-2 bg-[var(--bg-card)] hover:bg-[#2563EB] hover:text-white border border-[var(--border-color)] rounded-full text-[var(--text-primary)] shadow-md transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div 
            id="creative-slider-container"
            className="grid grid-flow-col auto-cols-[calc(33.333%-8px)] gap-3 overflow-x-hidden pb-1 px-1 scroll-smooth"
          >
            {assets.map((asset) => (
              <div 
                key={asset.day} 
                onClick={() => onImageClick(asset.url, `Day ${asset.day} Creative`)}
                className="group relative bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-xs cursor-pointer hover:border-[#2563EB] transition-all shrink-0 snap-start"
              >
                <div className="h-28 w-full bg-slate-900 overflow-hidden relative">
                  <img src={asset.url} alt={`Day ${asset.day}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <span className="absolute top-1.5 left-1.5 bg-black/75 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-md">
                    Day {asset.day}
                  </span>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                    🔍 View
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div 
          onClick={() => onImageClick(assets[0].url, 'Single Generated Creative')}
          className="h-32 w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden relative cursor-pointer group flex items-center justify-center"
        >
          <img src={assets[0].url} alt="Single preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
            🔍 Click to preview full screen
          </div>
        </div>
      )}
    </div>
  );
}

const DAYS_OF_WEEK = [
  { key: 'MON', label: 'Mon' }, { key: 'TUE', label: 'Tue' }, { key: 'WED', label: 'Wed' },
  { key: 'THU', label: 'Thu' }, { key: 'FRI', label: 'Fri' }, { key: 'SAT', label: 'Sat' }, { key: 'SUN', label: 'Sun' },
];

const PLATFORMS = [
  { id: 'LINKEDIN', label: 'LinkedIn' }, { id: 'FACEBOOK', label: 'Facebook Page' },
  { id: 'INSTAGRAM', label: 'Instagram' }, { id: 'X', label: 'X (Twitter)' },
];

export function SchedulingDispatcher() {
  const [schedules, setSchedules] = useState<AutomationSchedule[]>([]);
  const [dispatcherEnabled, setDispatcherEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<AutomationSchedule | null>(null);

  const [selectedImageModal, setSelectedImageModal] = useState<{ url: string; title: string } | null>(null);
  const [portalMounted, setPortalMounted] = useState<boolean>(false);

  useEffect(() => { setPortalMounted(true); }, []);

  const [formName, setFormName] = useState<string>('Daily Growth Engine');
  const [formDraftTime, setFormDraftTime] = useState<string>('09:00');
  const [formTime, setFormTime] = useState<string>('20:00');
  const [formTimezone, setFormTimezone] = useState<string>('Asia/Kolkata');
  const [formDays, setFormDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);
  const [formRepeat, setFormRepeat] = useState<string>('WEEKLY');
  const [formPlatforms, setFormPlatforms] = useState<('INSTAGRAM' | 'LINKEDIN' | 'X' | 'FACEBOOK')[]>(['LINKEDIN']);
  const [formTone, setFormTone] = useState<string>('ENGAGING');
  const [formFormatStyle, setFormFormatStyle] = useState<string>('SINGLE');
  const [formEmojiDensity, setFormEmojiDensity] = useState<string>('MEDIUM');
  const [formHashtagCount, setFormHashtagCount] = useState<string>('MODERATE');
  const [formContentLength, setFormContentLength] = useState<string>('BALANCED');
  const [formTopic, setFormTopic] = useState<string>('');
  
  const [isEnhancingTopic, setIsEnhancingTopic] = useState<boolean>(false);
  const [isTopicExpanded, setIsTopicExpanded] = useState<boolean>(false);
  const [sampleDrafts, setSampleDrafts] = useState<Record<string, string> | null>(null);
  const [generatingSample, setGeneratingSample] = useState<boolean>(false);
  
  // 🌟 Generated Images State lifted up for Live Previews
  const [generatedAssets, setGeneratedAssets] = useState<Array<{ day: number; url: string; prompt: string }>>([]);

  const [saving, setSaving] = useState<boolean>(false);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    ApiService.getConnectedAccounts()
      .then((accs) => setConnectedPlatforms(accs.map((a) => a.platform.toUpperCase())))
      .catch(() => {});
  }, []);

  const toast = useToast();

  const handleEnhanceTopic = async () => {
    if (!formTopic || !formTopic.trim()) {
      toast.error('Please enter a topic or instruction first.');
      return;
    }
    setIsEnhancingTopic(true);
    try {
      const result = await ApiService.enhancePrompt(formTopic, formPlatforms[0] || 'GENERAL', formTone);
      if (result.enhancedPrompt) {
        setFormTopic(result.enhancedPrompt);
        toast.success('Prompt magic-enhanced successfully!');
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
        { emojiDensity: formEmojiDensity, hashtagCount: formHashtagCount, formatStyle: formFormatStyle, contentLength: formContentLength }
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
      toast.error('Could not generate sample preview.');
    } finally {
      setGeneratingSample(false);
    }
  };

  const fetchPostsData = async () => {
    try { const res = await ApiService.getPosts(); setPosts(res || []); } catch (err) { console.error(err); }
  };

  const fetchSchedulesData = async () => {
    try {
      const res = await ApiService.getUserSchedules();
      setDispatcherEnabled(res.dispatcherEnabled);
      setSchedules(res.schedules || []);
    } catch (err) { toast.error('Failed to fetch schedules.'); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchSchedulesData();
    fetchPostsData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingSchedule(null);
    setFormName('Daily Growth Engine');
    setFormDraftTime('09:00');
    setFormTime('20:00');
    setFormTimezone('Asia/Kolkata');
    setFormDays(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);
    setFormRepeat('WEEKLY');
    setFormPlatforms(['LINKEDIN']);
    setFormTone('ENGAGING');
    setFormFormatStyle('SINGLE');
    setFormEmojiDensity('MEDIUM');
    setFormHashtagCount('MODERATE');
    setFormContentLength('BALANCED');
    setFormTopic('');
    setSampleDrafts(null);
    setGeneratedAssets([]); // 🌟 Reset images on open
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sched: AutomationSchedule) => {
    setEditingSchedule(sched);
    setFormName(sched.name);
    setFormDraftTime(sched.draftTimeOfDay || '09:00');
    setFormTime(sched.timeOfDay || '20:00');
    setFormTimezone(sched.timezone || 'Asia/Kolkata');
    setFormDays(sched.daysOfWeek || ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);
    setFormRepeat(sched.repeatType || 'WEEKLY');
    setFormPlatforms((sched.targetPlatforms as any) || ['LINKEDIN']);
    setFormTone(sched.tone || 'ENGAGING');
    setFormFormatStyle('SINGLE');
    setFormEmojiDensity('MEDIUM');
    setFormHashtagCount('MODERATE');
    setFormContentLength('BALANCED');
    setFormTopic(sched.topicPrompt || '');
    setSampleDrafts(null);
    setGeneratedAssets([]); // 🌟 Reset images on open
    setIsModalOpen(true);
  };

  const handleSaveSchedule = async () => {
    setSaving(true);
    try {
      const payload = {
        name: formName.trim() || 'Daily Auto-Post',
        draftTimeOfDay: formDraftTime,
        timeOfDay: formTime,
        timezone: formTimezone,
        daysOfWeek: formDays,
        repeatType: formRepeat,
        targetPlatforms: formPlatforms,
        tone: formTone,
        topicPrompt: formTopic.trim(),
        isActive: true,
      };

      if (editingSchedule) {
        await ApiService.updateSchedule(editingSchedule.id, payload);
        toast.success('Campaign updated successfully!');
      } else {
        await ApiService.createSchedule(payload);
        toast.success('New smart campaign created!');
      }
      setIsModalOpen(false);
      fetchSchedulesData();
    } catch (err: any) {
      toast.error('Failed to save campaign.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await ApiService.deleteSchedule(id);
      setSchedules(prev => prev.filter(s => s.id !== id));
      toast.success('Campaign deleted.');
    } catch (err) { toast.error('Failed to delete campaign.'); }
  };

  const handleRunNow = async (sched: AutomationSchedule) => {
    setRunningId(sched.id);
    try {
      const existingPendingPost = posts.find((p) => p.status === 'SCHEDULED');
      const updateTargetId = existingPendingPost ? existingPendingPost.id : undefined;

      await ApiService.runScheduleNow(sched.id, updateTargetId);
      toast.success(`🚀 Dispatched campaign "${sched.name}"!`);
      fetchSchedulesData();
      fetchPostsData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to trigger dispatch.');
    } finally { setRunningId(null); }
  };

  const handleToggleActiveSwitch = async (sched: AutomationSchedule) => {
    setTogglingId(sched.id);
    try {
      const updated = await ApiService.toggleSchedule(sched.id, !sched.isActive);
      setSchedules(prev => prev.map(s => s.id === sched.id ? updated : s));
      toast.success(`Campaign "${sched.name}" ${updated.isActive ? 'enabled' : 'paused'}.`);
    } catch (err) { toast.error('Could not change campaign state.'); } finally { setTogglingId(null); }
  };

  const handleToggleDay = (dayKey: string) => {
    if (formDays.includes(dayKey)) {
      if (formDays.length === 1) { toast.error('Select at least one day.'); return; }
      setFormDays(formDays.filter(d => d !== dayKey));
    } else { setFormDays([...formDays, dayKey]); }
  };

  const handleTogglePlatform = (platId: 'INSTAGRAM' | 'LINKEDIN' | 'X' | 'FACEBOOK') => {
    if (formPlatforms.includes(platId)) {
      if (formPlatforms.length === 1) { toast.error('Select at least one channel.'); return; }
      setFormPlatforms(formPlatforms.filter(p => p !== platId));
    } else { setFormPlatforms([...formPlatforms, platId]); }
  };

  const formatTimeDisplay = (time24: string) => {
    const [h, m] = (time24 || '09:00').split(':');
    return `${(parseInt(h) || 0).toString().padStart(2, '0')}:${m || '00'}`;
  };

  const formatDaysSummary = (selectedDays: string[] | undefined) => {
    if (!selectedDays || selectedDays.length === 0) return 'No Days';
    if (selectedDays.length === 7) return 'Everyday';
    return `${selectedDays.length} Days/wk`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <div className="w-10 h-10 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-[var(--text-secondary)]">Loading Smart Campaigns...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
        <span className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">Active Campaigns ({schedules.length})</span>
        <button 
          onClick={handleOpenAddModal} 
          className="flex items-center gap-1.5 px-5 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
        >
          <Plus className="h-4 w-4" /> New Campaign
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] border-dashed rounded-3xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-[#2563EB] rounded-2xl flex items-center justify-center mx-auto">
            <Layers className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-[var(--text-primary)]">No Smart Campaigns Running</h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
              Automate your social growth. Create a campaign to consistently generate and publish AI content.
            </p>
          </div>
          <button onClick={handleOpenAddModal} className="px-6 py-2.5 bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-color)] text-[var(--text-primary)] font-extrabold text-xs rounded-xl transition-all cursor-pointer">
            + Create Campaign
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
                className={`group bg-[var(--bg-card)] border rounded-2xl p-4 transition-all duration-300 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm hover:shadow-md ${
                  sched.isActive ? 'border-[var(--border-color)] hover:border-[#2563EB]/40' : 'border-[var(--border-color)] opacity-60 bg-[var(--bg-input)]'
                }`}
              >
                <div className="flex items-center gap-4 min-w-[280px] flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    sched.isActive ? 'bg-blue-50 text-[#2563EB] border-blue-200' : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border-color)]'
                  }`}>
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-[13px] text-[var(--text-primary)]">{sched.name}</h3>
                      <span className={`w-2 h-2 rounded-full ${sched.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    </div>
                    {sched.topicPrompt ? (
                      <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1 max-w-[250px] font-medium">"{sched.topicPrompt}"</p>
                    ) : (
                      <p className="text-[11px] text-[var(--text-secondary)] italic">No specific prompt</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-[var(--bg-input)] border border-[var(--border-color)] px-3.5 py-2 rounded-xl shrink-0">
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                    <span>🌅 Draft:</span>
                    <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{formatTimeDisplay(sched.draftTimeOfDay || '09:00')}</span>
                  </div>
                  <span className="hidden sm:inline text-slate-400">➔</span>
                  <div className="flex items-center gap-1.5 sm:border-r border-[var(--border-color)] sm:pr-3">
                    <span className="text-[11px] text-[#2563EB] font-bold">🚀 Live:</span>
                    <span className="font-mono text-xs font-black text-[var(--text-primary)]">{formatTimeDisplay(sched.timeOfDay || '20:00')}</span>
                  </div>
                  <span className="text-[11px] font-extrabold text-[var(--text-secondary)]">{formatDaysSummary(sched.daysOfWeek)}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {sched.targetPlatforms?.map((p) => (
                    <span key={p} className="text-[9px] font-extrabold uppercase px-2 py-1 rounded-md bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)]">
                      {p}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 border-t lg:border-t-0 border-[var(--border-color)] pt-3 lg:pt-0">
                  <button
                    onClick={() => handleToggleActiveSwitch(sched)}
                    disabled={isToggling}
                    className={`focus:outline-none transition-transform active:scale-95 mr-2 cursor-pointer ${sched.isActive ? 'text-[#2563EB]' : 'text-[var(--text-secondary)]'}`}
                  >
                    {sched.isActive ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8" />}
                  </button>

                  {!sched.lastRunAt && (
                    <button
                      onClick={() => handleRunNow(sched)}
                      disabled={isRunning}
                      title="Run Now"
                      className="p-2 text-[var(--text-secondary)] hover:text-[#2563EB] hover:bg-blue-50 rounded-lg cursor-pointer"
                    >
                      {isRunning ? <span className="w-4 h-4 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin block" /> : <Play className="h-4 w-4" />}
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenEditModal(sched)}
                    title="Edit Campaign"
                    className="p-2 text-[var(--text-secondary)] hover:text-[#2563EB] rounded-lg cursor-pointer"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteSchedule(sched.id, sched.name)}
                    title="Delete Campaign"
                    className="p-2 text-[var(--text-secondary)] hover:text-rose-500 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🌟 WIDER & FULLY FEATURED 2-COLUMN STUDIO MODAL */}
      {isModalOpen && portalMounted && createPortal(
        <div onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }} className="fixed inset-0 z-[99990] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl max-w-[96vw] xl:max-w-[1650px] w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[94vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-2xl text-[#2563EB]">
                  <AlarmClock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-[var(--text-primary)]">
                    {editingSchedule ? 'Edit Smart Campaign' : 'New Smart Campaign Studio'}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">Configure schedule frequencies, target channels, and live AI feed previews</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl font-extrabold text-sm transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      {editingSchedule ? 'Save Campaign' : 'Create Campaign'}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2.5 bg-[var(--bg-input)] hover:bg-[var(--border-color)] text-[var(--text-secondary)] hover:text-rose-500 rounded-xl transition-all border border-[var(--border-color)] cursor-pointer shadow-sm"
                  title="Close popup"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* ULTRA-WIDE 2-COLUMN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start overflow-y-auto pr-2.5 custom-scrollbar shrink">
              
              {/* LEFT COLUMN: Controls & Setup (6 Cols) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">Campaign Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Daily Growth Autopilot"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] font-semibold"
                  />
                </div>

                <div className="bg-[var(--bg-input)]/50 border border-[var(--border-color)] p-4 rounded-2xl space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-[#2563EB] uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> 2-Stage Review & Publishing Pipeline
                    </span>
                    <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-[#2563EB] font-bold px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                      Approval Safe
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Stage 1: AI Draft & Review Email Time */}
                    <div className="space-y-1 bg-[var(--bg-card)] border border-[var(--border-color)] p-3 rounded-xl">
                      <label className="text-[11px] font-bold text-[var(--text-primary)] block">
                        🌅 1. AI Draft & Review Email
                      </label>
                      <p className="text-[10px] text-[var(--text-secondary)]">Time when AI generates content & sends approval link</p>
                      <input
                        type="time"
                        required
                        value={formDraftTime}
                        onChange={(e) => setFormDraftTime(e.target.value)}
                        className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] font-mono font-bold mt-1"
                      />
                    </div>

                    {/* Stage 2: Live Publishing Dispatch Time */}
                    <div className="space-y-1 bg-[var(--bg-card)] border border-[var(--border-color)] p-3 rounded-xl">
                      <label className="text-[11px] font-bold text-[var(--text-primary)] block">
                        🚀 2. Live Social Dispatch
                      </label>
                      <p className="text-[10px] text-[var(--text-secondary)]">Time when approved post goes live to channels</p>
                      <input
                        type="time"
                        required
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] font-mono font-bold mt-1"
                      />
                    </div>
                  </div>

                  {/* Timezone & Frequency Bar */}
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[var(--border-color)]/60">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Timezone</label>
                      <select
                        value={formTimezone}
                        onChange={(e) => setFormTimezone(e.target.value)}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] font-mono"
                      >
                        <option value="Asia/Kolkata">IST (UTC+5:30) - India</option>
                        <option value="UTC">UTC (Universal)</option>
                        <option value="America/New_York">EST (UTC-5:00) - New York</option>
                        <option value="America/Los_Angeles">PST (UTC-8:00) - Los Angeles</option>
                        <option value="Europe/London">GMT (UTC+0:00) - London</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Frequency</label>
                      <select
                        value={formRepeat}
                        onChange={(e) => setFormRepeat(e.target.value)}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] font-bold"
                      >
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                      </select>
                    </div>
                  </div>

                  {/* Dynamic Review Window Banner */}
                  {(() => {
                    const pipeline = getReviewPipelineNarrative(formDraftTime, formTime);
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
                                  Draft created the evening before at <strong className="text-indigo-900 dark:text-white font-extrabold">{pipeline.draftTimeDisplay}</strong> ➔ Review & approve via email or web before auto-dispatch next morning at <strong className="text-indigo-900 dark:text-white font-extrabold">{pipeline.publishTimeDisplay} (Next Day)</strong>.
                                </>
                              ) : (
                                <>
                                  Draft created daily at <strong className="text-blue-900 dark:text-white font-extrabold">{pipeline.draftTimeDisplay}</strong> ➔ Review & approve via email or web before auto-dispatch at <strong className="text-blue-900 dark:text-white font-extrabold">{pipeline.publishTimeDisplay}</strong>.
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

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">Dispatch Days</label>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAYS_OF_WEEK.map((d) => {
                      const isSelected = formDays.includes(d.key);
                      return (
                        <button
                          type="button"
                          key={d.key}
                          onClick={() => handleToggleDay(d.key)}
                          className={`py-2 rounded-xl font-bold text-xs cursor-pointer ${
                            isSelected ? 'bg-blue-50 text-[#2563EB] border border-blue-300 shadow-xs' : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">Target Channels</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {PLATFORMS.map((p) => {
                      const isSelected = formPlatforms.includes(p.id as any);
                      return (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => handleTogglePlatform(p.id as any)}
                          className={`py-2 px-3 rounded-2xl font-bold text-xs flex items-center justify-between border cursor-pointer ${
                            isSelected ? 'bg-blue-50 text-[#2563EB] border-blue-300 shadow-xs' : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                          }`}
                        >
                          <span className="truncate">{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Topic Instructions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-[#2563EB] uppercase tracking-wider block flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> Topic & Niche Instructions
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsTopicExpanded(true)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[#2563EB] bg-[var(--bg-input)] border border-[var(--border-color)] px-2 py-0.5 rounded-lg cursor-pointer"
                    >
                      <Maximize2 className="h-3 w-3" /> Full View
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    placeholder="e.g. Share software growth tips, SaaS architecture insights..."
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#2563EB] resize-none"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleEnhanceTopic}
                      disabled={isEnhancingTopic || !formTopic.trim()}
                      className="flex items-center gap-1.5 text-xs font-bold text-[#2563EB] bg-blue-50 dark:bg-blue-900/20 border border-blue-200 px-3 py-1.5 rounded-xl transition-all disabled:opacity-40 cursor-pointer shadow-xs"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isEnhancingTopic ? 'animate-spin' : ''}`} />
                      {isEnhancingTopic ? 'Enhancing...' : '✨ Magic Enhance Prompt'}
                    </button>

                    <button
                      type="button"
                      onClick={handlePreviewSampleAi}
                      disabled={generatingSample || formPlatforms.length === 0}
                      className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-600 px-3 py-1.5 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-xs ml-auto"
                    >
                      {generatingSample ? 'Generating...' : '✨ Sample Post Preview'}
                    </button>
                  </div>
                </div>

                {/* ADVANCED TEXT CONTROLS */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[var(--border-color)]">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">AI Tone</label>
                    <select value={formTone} onChange={(e) => setFormTone(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-2.5 py-1.5 text-[var(--text-primary)] text-[11px] font-medium">
                      {TONES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Format Style</label>
                    <select value={formFormatStyle} onChange={(e) => setFormFormatStyle(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-2.5 py-1.5 text-[var(--text-primary)] text-[11px] font-medium">
                      <option value="SINGLE">Standard Post</option>
                      <option value="THREAD">Numbered Thread</option>
                      <option value="CAROUSEL">Carousel Outline</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Emoji Density</label>
                    <select value={formEmojiDensity} onChange={(e) => setFormEmojiDensity(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-2.5 py-1.5 text-[var(--text-primary)] text-[11px] font-medium">
                      <option value="NONE">None</option>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Hashtag Count</label>
                    <select value={formHashtagCount} onChange={(e) => setFormHashtagCount(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-2.5 py-1.5 text-[var(--text-primary)] text-[11px] font-medium">
                      <option value="NONE">None</option>
                      <option value="FEW">Few (1-3)</option>
                      <option value="MODERATE">Moderate (4-6)</option>
                      <option value="RICH">Rich (7+)</option>
                    </select>
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Char Length</label>
                    <select value={formContentLength} onChange={(e) => setFormContentLength(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-2.5 py-1.5 text-[var(--text-primary)] text-[11px] font-medium">
                      <option value="SHORT">Short & Punchy</option>
                      <option value="BALANCED">Balanced</option>
                      <option value="LONG">Long-form Deep Dive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: AI Visual Studio & Live Feed Previews (6 Cols) */}
              <div className="lg:col-span-6 space-y-4">
                {/* AI Visual Studio with correctly linked state */}
                <CampaignCreativeStudio 
                  campaignTopic={formTopic} 
                  onImageClick={(url, title) => setSelectedImageModal({ url, title })}
                  assets={generatedAssets}
                  onAssetsUpdate={setGeneratedAssets} 
                />

                {/* Live Feed Mockup Previews */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#2563EB]" /> Live Feed Mockup Previews
                  </h4>

                  {!sampleDrafts ? (
                    <div className="bg-[var(--bg-input)] border border-[var(--border-color)] border-dashed rounded-3xl p-12 text-center space-y-2 shadow-inner">
                      <Zap className="h-8 w-8 text-[#2563EB] mx-auto animate-bounce" />
                      <h5 className="text-xs font-bold text-[var(--text-primary)]">No Sample Post Generated Yet</h5>
                      <p className="text-[11px] text-[var(--text-secondary)] max-w-xs mx-auto">
                        Click <strong className="text-[#2563EB]">"Sample Post Preview"</strong> on the left to see live adapted drafts!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                      {formPlatforms.map((plat) => {
                        const text = sampleDrafts[plat] || '';
                        return (
                          <div key={plat} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 shadow-sm space-y-2 relative group">
                            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                              <div className="flex items-center gap-2">
                                <PlatformIcon platform={plat} className="h-6 w-6" />
                                <span className="text-[11px] font-bold uppercase text-[var(--text-primary)]">{plat} Preview</span>
                              </div>

                              {/* Zoom button using actually generated image or error if none generated */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (generatedAssets.length > 0) {
                                    setSelectedImageModal({
                                      url: generatedAssets[0].url,
                                      title: `${plat} Post Preview & Creative`
                                    });
                                  } else {
                                    toast.error('Please generate AI visuals first to see full preview!');
                                  }
                                }}
                                className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-secondary)] hover:text-[#2563EB] bg-[var(--bg-input)] border border-[var(--border-color)] px-2 py-1 rounded-lg transition-all cursor-pointer"
                                title="Zoom / Preview Fullscreen"
                              >
                                <Maximize2 className="w-3 h-3" /> Zoom
                              </button>
                            </div>

                            <textarea
                              value={text}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSampleDrafts((prev) => ({ ...(prev || {}), [plat]: val }));
                              }}
                              rows={4}
                              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#2563EB] resize-y"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* FULL SCREEN EXPANDED TOPIC MODAL */}
      {isTopicExpanded && portalMounted && createPortal(
        <div className="fixed inset-0 z-[9999999] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-card)]">
              <h3 className="font-bold text-base text-[var(--text-primary)]">Full Screen Topic Instructions</h3>
              <button type="button" onClick={() => setIsTopicExpanded(false)} className="p-2 rounded-xl bg-[var(--bg-input)] text-[var(--text-secondary)] cursor-pointer">
                <Minimize2 className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 flex-1 flex flex-col bg-[var(--bg-body)]">
              <textarea
                value={formTopic}
                onChange={(e) => setFormTopic(e.target.value)}
                placeholder="Type your detailed topic instructions here..."
                className="w-full flex-1 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#2563EB] min-h-[350px]"
              />
            </div>
            <div className="flex items-center justify-end px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-card)]">
              <button type="button" onClick={() => setIsTopicExpanded(false)} className="px-6 py-2.5 bg-[#2563EB] text-white text-xs font-bold rounded-xl cursor-pointer">
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* LIGHTBOX POPUP */}
      {selectedImageModal && portalMounted && createPortal(
        <div onClick={() => setSelectedImageModal(null)} className="fixed inset-0 z-[99999999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 cursor-pointer">
          <div onClick={(e) => e.stopPropagation()} className="relative max-w-5xl w-full flex items-center justify-center">
            <button onClick={() => setSelectedImageModal(null)} className="absolute -top-12 right-0 p-2 text-white bg-black/50 hover:bg-black/80 rounded-full border border-white/10 cursor-pointer">
              <X className="w-6 h-6" />
            </button>
            <img src={selectedImageModal.url} alt={selectedImageModal.title} className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10" />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default SchedulingDispatcher;