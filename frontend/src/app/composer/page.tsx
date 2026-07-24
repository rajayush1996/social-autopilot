'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Upload, 
  Send, 
  Calendar, 
  X, 
  ShieldAlert, 
  Info,
  CheckCircle2,
  FileText,
  User as UserIcon,
  MessageSquare,
  Repeat,
  Heart,
  Share2,
  AlarmClock,
  PenTool,
  Clock,
  Zap,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import ApiService from '@/services/apiService';
import CONFIG from '@/config';
import { useToast } from '@/context/ToastContext';
import SchedulingDispatcher from '@/components/SchedulingDispatcher';
import accountEvents from '@/utils/accountEvents';
import getSocket from '@/utils/socket';

type PlatformKey = 'INSTAGRAM' | 'LINKEDIN' | 'X';

export function InstagramPlatformIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export function LinkedinPlatformIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

export function XPlatformIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
      <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
    </svg>
  );
}

const PRESET_PROMPTS = [
  { label: '🚀 Product Launch', text: 'Write an announcement launching our new software dashboard, highlighting productivity and clean integrations.' },
  { label: '💡 Tech Tip', text: 'Share a weekly tip explaining the benefits of decoupling API queries into structured client services.' },
  { label: '💬 Client Review', text: 'Draft a thank-you note highlighting a recent client success story and expressing appreciation for their feedback.' },
  { label: '📈 Progress Update', text: 'Summarize our engineering progress this week, detailing backend performance improvements.' },
];

export default function ComposerPage() {
  const [composerMode, setComposerMode] = useState<'SINGLE' | 'RECURRING'>('SINGLE');

  // Single Composer States
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('ENGAGING');
  const [platforms, setPlatforms] = useState<PlatformKey[]>(['LINKEDIN', 'X']);
  
  // Advanced AI Prompt Controls
  const [inputSource, setInputSource] = useState<'PROMPT' | 'URL'>('PROMPT');
  const [articleUrl, setArticleUrl] = useState('');
  const [emojiDensity, setEmojiDensity] = useState('MEDIUM');
  const [hashtagCount, setHashtagCount] = useState('MODERATE');
  const [formatStyle, setFormatStyle] = useState('SINGLE');

  // Media Upload States
  const [uploading, setUploading] = useState(false);
  const [mediaFileUrl, setMediaFileUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO' | null>(null);

  // AI Generation States
  const [generating, setGenerating] = useState(false);
  const [aiLimitReached, setAiLimitReached] = useState(false);
  const [generatedDrafts, setGeneratedDrafts] = useState<Record<PlatformKey, string>>({
    INSTAGRAM: '',
    LINKEDIN: '',
    X: '',
  });

  // Connected Accounts State
  const [connectedPlatforms, setConnectedPlatforms] = useState<PlatformKey[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const [publishNow, setPublishNow] = useState(true);
  const [scheduledDate, setScheduledDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // Initialize Socket.io connection for realtime WebSocket event handling
    getSocket();

    const fetchAccounts = async () => {
      setLoadingAccounts(true);
      try {
        const accounts = await ApiService.getConnectedAccounts();
        if (Array.isArray(accounts)) {
          const activePlatforms = accounts
            .filter((acc: any) => acc.isActive)
            .map((acc: any) => acc.platform.toUpperCase() as PlatformKey);
          setConnectedPlatforms(activePlatforms);
        }
      } catch (err) {
        console.error('Failed to load connected accounts:', err);
      } finally {
        setLoadingAccounts(false);
      }
    };
    fetchAccounts();

    window.addEventListener('focus', fetchAccounts);
    const unsubscribe = accountEvents.subscribe((event) => {
      console.log('Realtime Account Event Received:', event);
      fetchAccounts();
    });

    return () => {
      window.removeEventListener('focus', fetchAccounts);
      unsubscribe();
    };
  }, []);

  const handlePresetSelect = (presetText: string) => {
    setTopic(presetText);
  };

  const getCharCount = (plt: PlatformKey) => generatedDrafts[plt]?.length || 0;

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploadRes = await ApiService.uploadMedia(file);
      if (uploadRes && uploadRes.fileUrl) {
        setMediaFileUrl(uploadRes.fileUrl);
        setMediaType(uploadRes.mediaType);
        toast.success('Media uploaded successfully!');
      }
    } catch (err) {
      console.error('File Upload Error:', err);
      toast.error('Failed to upload file.');
    } finally {
      setUploading(false);
    }
  };

  const handleAIGenerate = async () => {
    if (inputSource === 'PROMPT' && !topic) {
      toast.error('Please enter a topic or prompt first.');
      return;
    }
    if (inputSource === 'URL' && !articleUrl) {
      toast.error('Please enter an Article/Blog URL first.');
      return;
    }

    setGenerating(true);
    setAiLimitReached(false);
    try {
      const generated: any = await ApiService.generateAiContent(
        topic,
        tone,
        platforms,
        {
          emojiDensity,
          hashtagCount,
          formatStyle,
          articleUrl: inputSource === 'URL' ? articleUrl : '',
        }
      );
      if (generated) {
        const draftMap = generated.adaptedPosts || generated;
        setGeneratedDrafts({
          INSTAGRAM: draftMap.INSTAGRAM || generated.INSTAGRAM || generated.content || '',
          LINKEDIN: draftMap.LINKEDIN || generated.LINKEDIN || generated.content || '',
          X: draftMap.X || generated.X || generated.content || '',
        });
        toast.success('AI content generated for selected platforms!');
      }
    } catch (err: any) {
      console.error('AI Generation Failed:', err);
      if (err.response?.status === 429) {
        setAiLimitReached(true);
      } else {
        toast.error(err.response?.data?.message || 'Failed to generate content.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleSchedulePost = async () => {
    // Build platform-specific draft JSON payload
    const platformDraftMap: Record<string, string> = {};
    let hasAnyDraft = false;

    platforms.forEach((p) => {
      const draftText = generatedDrafts[p] || topic;
      if (draftText) {
        platformDraftMap[p] = draftText;
        hasAnyDraft = true;
      }
    });

    if (!hasAnyDraft) {
      toast.error('Post content cannot be empty. Please enter a topic or generate AI drafts.');
      return;
    }

    // Check unconnected platforms
    const unconnectedSelected = platforms.filter((p) => !connectedPlatforms.includes(p));
    if (unconnectedSelected.length > 0) {
      toast.info(`Note: ${unconnectedSelected.join(', ')} is not connected yet. Post will queue and publish once connected.`);
    }

    setSubmitting(true);
    try {
      const payload = {
        content: JSON.stringify(platformDraftMap),
        mediaUrls: mediaFileUrl ? [mediaFileUrl] : [],
        mediaType: mediaType,
        targetPlatforms: platforms,
        scheduledAt: publishNow ? null : new Date(scheduledDate).toISOString(),
        publishNow,
      };

      await ApiService.createPost(payload);
      toast.success(publishNow ? 'Multi-platform post queued for immediate publishing!' : 'Multi-platform post scheduled successfully!');
      
      // Reset Form Inputs
      setTopic('');
      setGeneratedDrafts({ INSTAGRAM: '', LINKEDIN: '', X: '' });
      setMediaFileUrl('');
      setMediaType(null);
    } catch (err: any) {
      console.error('Scheduling failed:', err);
      toast.error(err.response?.data?.message || 'Failed to schedule post.');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePlatform = (p: PlatformKey) => {
    setPlatforms(prev => 
      prev.includes(p) ? prev.filter(item => item !== p) : [...prev, p]
    );
  };

  const handleTextChange = (plt: PlatformKey, val: string) => {
    setGeneratedDrafts(prev => ({ ...prev, [plt]: val }));
  };

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Header with Mode Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-900">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-200 tracking-tight">
            AI Post Composer & Dispatcher
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Create single posts with AI copy generation or set up recurring alarm-style automation dispatches.
          </p>
        </div>

        {/* Clean Mode Switcher Tabs */}
        <div className="inline-flex p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl gap-1.5 backdrop-blur-md shrink-0">
          <button
            onClick={() => setComposerMode('SINGLE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 ${
              composerMode === 'SINGLE'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <PenTool className="h-4 w-4" />
            Single Post
          </button>

          <button
            onClick={() => setComposerMode('RECURRING')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 ${
              composerMode === 'RECURRING'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <AlarmClock className="h-4 w-4 text-indigo-300" />
            Scheduling Dispatcher
          </button>
        </div>
      </div>

      {/* MODE 1: SINGLE POST COMPOSER */}
      {composerMode === 'SINGLE' && (
        <div className="space-y-8 animate-fadeIn">
          {aiLimitReached && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 text-rose-400">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 shrink-0 text-rose-500" />
                <div>
                  <p className="text-xs font-bold">AI Credits Exhausted</p>
                  <p className="text-[10px] text-rose-400/90">Upgrade your plan to continue generating AI content.</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Clean Prompt & Controls */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Prompt Input Card */}
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    1. Enter Topic or AI Prompt
                  </h2>
                  <span className="text-[10px] text-slate-500 font-semibold">Step 1 of 3</span>
                </div>

                {/* Input Source Mode Switcher */}
                <div className="flex items-center gap-2 bg-slate-955 p-1 rounded-xl border border-slate-850">
                  <button
                    type="button"
                    onClick={() => setInputSource('PROMPT')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      inputSource === 'PROMPT'
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    💬 Custom Topic / Prompt
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputSource('URL')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      inputSource === 'URL'
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🔗 Repurpose Blog / Article URL
                  </button>
                </div>

                {inputSource === 'URL' ? (
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Article / Blog Post URL</label>
                    <input
                      type="url"
                      value={articleUrl}
                      onChange={(e) => setArticleUrl(e.target.value)}
                      placeholder="https://yourblog.com/posts/scaling-productivity"
                      className="w-full bg-slate-955 border border-slate-850 rounded-2xl px-4 py-3 text-slate-200 text-xs focus:outline-none focus:border-indigo-500/60 transition-colors placeholder:text-slate-600"
                    />
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Additional instructions for repurposing (optional)..."
                      rows={2}
                      className="w-full bg-slate-955 border border-slate-850 rounded-2xl px-4 py-2 text-slate-200 text-xs focus:outline-none focus:border-indigo-500/60 transition-colors placeholder:text-slate-600 leading-relaxed resize-none"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="What would you like to post about today?"
                      rows={4}
                      className="w-full bg-slate-955 border border-slate-850 rounded-2xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/60 transition-colors placeholder:text-slate-600 leading-relaxed resize-none"
                    />
                    
                    {/* Preset Pills */}
                    <div className="flex flex-wrap gap-2">
                      {PRESET_PROMPTS.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handlePresetSelect(p.text)}
                          className="text-[10px] bg-slate-955 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-indigo-300 font-medium px-3 py-1 rounded-full transition-all"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Platform & Tone Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-850/60">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Target Channels</label>
                      <a href="/accounts" className="text-[10px] text-indigo-400 hover:underline font-semibold flex items-center gap-1">
                        Connect Accounts <ChevronRight className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(['LINKEDIN', 'X', 'INSTAGRAM'] as PlatformKey[]).map((p) => {
                        const active = platforms.includes(p);
                        const isConnected = connectedPlatforms.includes(p);
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => togglePlatform(p)}
                            className={`flex-1 py-2 rounded-xl border text-[10px] font-extrabold tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 ${
                              active
                                ? isConnected
                                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : 'bg-slate-955 text-slate-500 border-slate-850'
                            }`}
                            title={isConnected ? `${p} Connected` : `${p} Not Connected - Click to connect`}
                          >
                            {active && isConnected && <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />}
                            {active && !isConnected && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />}
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Tone</label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-850 rounded-xl px-3 py-2 text-slate-300 text-xs font-medium focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ENGAGING">Engaging & Conversational</option>
                      <option value="PROFESSIONAL">Professional Business</option>
                      <option value="CASUAL">Casual & Friendly</option>
                      <option value="HUMOROUS">Humorous & Witty</option>
                      <option value="PROMOTIONAL">Promotional & Direct</option>
                    </select>
                  </div>
                </div>

                {/* Advanced Formatting Controls (Emoji Density, Hashtag Strategy, Format Style) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-850/60">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Emoji Density</label>
                    <select
                      value={emojiDensity}
                      onChange={(e) => setEmojiDensity(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-850 rounded-xl px-2.5 py-1.5 text-slate-300 text-[11px] font-medium focus:outline-none focus:border-indigo-500"
                    >
                      <option value="NONE">None (0 Emojis)</option>
                      <option value="LOW">Subtle (1-2 Emojis)</option>
                      <option value="MEDIUM">Balanced (3-5 Emojis)</option>
                      <option value="HIGH">Vibrant (Heavy Emojis)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Hashtag Strategy</label>
                    <select
                      value={hashtagCount}
                      onChange={(e) => setHashtagCount(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-850 rounded-xl px-2.5 py-1.5 text-slate-300 text-[11px] font-medium focus:outline-none focus:border-indigo-500"
                    >
                      <option value="NONE">No Hashtags</option>
                      <option value="MODERATE">Moderate (3-5 Hashtags)</option>
                      <option value="HEAVY">Heavy (8-12 Hashtags)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Format Style</label>
                    <select
                      value={formatStyle}
                      onChange={(e) => setFormatStyle(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-850 rounded-xl px-2.5 py-1.5 text-slate-300 text-[11px] font-medium focus:outline-none focus:border-indigo-500"
                    >
                      <option value="SINGLE">Standard Post</option>
                      <option value="THREAD">Numbered Thread (1/ 2/)</option>
                      <option value="CAROUSEL">Slide-by-Slide Outline</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleAIGenerate}
                  disabled={generating || (inputSource === 'PROMPT' ? !topic : !articleUrl)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl font-bold text-xs transition-all duration-300 active:scale-95 disabled:opacity-50 shadow-md shadow-indigo-950/30"
                >
                  {generating ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating AI Drafts...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate AI Post Drafts
                    </>
                  )}
                </button>
              </div>

              {/* Media Attachment Dropzone */}
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    2. Attach Media (Optional)
                  </h2>
                  <span className="text-[10px] text-slate-500 font-semibold">Step 2 of 3</span>
                </div>

                <div className="relative border border-dashed border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 transition-all group flex flex-col items-center justify-center text-center cursor-pointer bg-slate-955/60">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleMediaUpload}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  {uploading ? (
                    <div className="space-y-2 py-2">
                      <div className="w-7 h-7 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-[10px] text-slate-400 font-semibold">Uploading asset...</p>
                    </div>
                  ) : mediaFileUrl ? (
                    <div className="space-y-3 w-full">
                      {mediaType === 'VIDEO' ? (
                        <video src={mediaFileUrl} controls className="max-h-40 rounded-xl mx-auto border border-slate-800" />
                      ) : (
                        <img src={mediaFileUrl} alt="Preview" className="max-h-40 rounded-xl mx-auto border border-slate-800 object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setMediaFileUrl(''); setMediaType(null); }}
                        className="text-[10px] text-rose-400 font-bold hover:underline flex items-center gap-1 mx-auto"
                      >
                        <X className="h-3 w-3" /> Remove File
                      </button>
                    </div>
                  ) : (
                    <div className="py-2">
                      <Upload className="h-6 w-6 text-slate-600 group-hover:text-indigo-400 transition-colors mx-auto mb-1.5" />
                      <p className="text-xs text-slate-300 font-bold">Click or drag media file to upload</p>
                      <span className="text-[9px] text-slate-500 block mt-0.5">Images or HD MP4 videos</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Publish / Schedule Control Card */}
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    3. Publish Options
                  </h2>
                  <span className="text-[10px] text-slate-500 font-semibold">Step 3 of 3</span>
                </div>

                <div className="flex items-center gap-3 bg-slate-955 p-1 rounded-xl border border-slate-850">
                  <button
                    type="button"
                    onClick={() => setPublishNow(true)}
                    className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all duration-300 ${
                      publishNow ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Publish Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublishNow(false)}
                    className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all duration-300 ${
                      !publishNow ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Schedule Date & Time
                  </button>
                </div>

                {!publishNow && (
                  <div className="space-y-1.5 pt-1 animate-fadeIn">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Target Date & Time</label>
                    <input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <button
                  onClick={handleSchedulePost}
                  disabled={submitting || (!publishNow && !scheduledDate)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-indigo-950/30"
                >
                  {submitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Dispatching Campaign...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {publishNow ? 'Publish Campaign Now' : 'Schedule One-Time Release'}
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Right Column: Live Feed Previews */}
            <div className="lg:col-span-5 space-y-6">
              <div className="sticky top-6 space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Feed Preview</h2>

                {platforms.length === 0 ? (
                  <div className="bg-slate-900/30 border border-slate-850 border-dashed rounded-3xl p-8 text-center space-y-2">
                    <Info className="h-6 w-6 text-slate-600 mx-auto" />
                    <p className="text-slate-500 text-xs font-medium">Select at least one channel above</p>
                  </div>
                ) : (
                  platforms.map((platform) => {
                    const isX = platform === 'X';
                    const isLinkedIn = platform === 'LINKEDIN';
                    const isInstagram = platform === 'INSTAGRAM';
                    const charCount = getCharCount(platform);

                    return (
                      <div key={platform} className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-5 shadow-xl space-y-3 backdrop-blur-md">
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-850">
                          <div className="flex items-center gap-2">
                            {isInstagram && <InstagramPlatformIcon className="text-pink-400" />}
                            {isLinkedIn && <LinkedinPlatformIcon className="text-blue-400" />}
                            {isX && <XPlatformIcon className="text-slate-300" />}
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300">{platform} Preview</span>
                          </div>

                          {isX && (
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                              charCount > 280 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-955 text-slate-500'
                            }`}>
                              {charCount} / 280
                            </span>
                          )}
                        </div>

                        {/* Interactive Editable Preview Box */}
                        <div className="bg-slate-955 border border-slate-850 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-xs font-bold">
                              <UserIcon className="h-4 w-4" />
                            </div>
                            <div className="text-[10px]">
                              <p className="font-bold text-slate-200">Your Brand Profile</p>
                              <p className="text-slate-500">Draft preview</p>
                            </div>
                          </div>

                          <textarea
                            value={generatedDrafts[platform]}
                            onChange={(e) => handleTextChange(platform, e.target.value)}
                            placeholder={`Generated text for ${platform} will appear here...`}
                            rows={5}
                            className="w-full bg-transparent border-none p-0 text-xs text-slate-200 focus:outline-none leading-relaxed resize-none"
                          />

                          {mediaFileUrl && (
                            <div className="rounded-xl overflow-hidden border border-slate-850 max-h-40 bg-slate-900 flex items-center justify-center">
                              {mediaType === 'VIDEO' ? (
                                <video src={mediaFileUrl} muted className="w-full max-h-40 object-contain" />
                              ) : (
                                <img src={mediaFileUrl} alt="Attachment" className="w-full max-h-40 object-cover" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: RECURRING SCHEDULING DISPATCHER */}
      {composerMode === 'RECURRING' && (
        <div className="animate-fadeIn">
          <SchedulingDispatcher />
        </div>
      )}
    </div>
  );
}
