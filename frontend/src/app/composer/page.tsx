'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  ChevronRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import ApiService from '@/services/apiService';
import CONFIG from '@/config';
import { useToast } from '@/context/ToastContext';
import SchedulingDispatcher from '@/components/SchedulingDispatcher';
import LiquidUploadButton from '@/components/LiquidUploadButton';
import PlatformIcon from '@/components/PlatformIcon';
import {
  getPlatformDefinition,
  getPlatformDefinitions,
  PLATFORM_REGISTRY,
  type PlatformId,
} from '@/config/platforms';
import accountEvents from '@/utils/accountEvents';
import socketClient from '@/utils/socket';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  togglePlatformAction,
  setSelectedPlatforms,
  setTopicAction,
  setToneAction,
  setInputSourceAction,
  setArticleUrlAction,
  setEmojiDensityAction,
  setHashtagCountAction,
  setFormatStyleAction,
  setContentLengthAction,
  setDraftForPlatformAction,
  setAllDraftsAction,
  setComposerModeAction,
  resetDraftsAndInputsAction,
} from '@/store/composerSlice';

type PlatformKey = PlatformId;

const PRESET_PROMPTS = [
  { label: '🚀 Product Launch', text: 'Write an announcement launching our new software dashboard, highlighting productivity and clean integrations.' },
  { label: '💡 Tech Tip', text: 'Share a weekly tip explaining the benefits of decoupling API queries into structured client services.' },
  { label: '💬 Client Review', text: 'Draft a thank-you note highlighting a recent client success story and expressing appreciation for their feedback.' },
  { label: '📈 Progress Update', text: 'Summarize our engineering progress this week, detailing backend performance improvements.' },
];

const TONE_OPTIONS = [
  { value: 'ENGAGING', label: 'Engaging', hint: 'Engaging & Conversational' },
  { value: 'PROFESSIONAL', label: 'Professional', hint: 'Professional Business' },
  { value: 'CASUAL', label: 'Casual', hint: 'Casual & Friendly' },
  { value: 'HUMOROUS', label: 'Humorous', hint: 'Humorous & Witty' },
  { value: 'PROMOTIONAL', label: 'Promotional', hint: 'Promotional & Direct' },
];

export default function ComposerPage() {
  const dispatch = useAppDispatch();
  const reduxComposer = useAppSelector((state) => state.composer);

  const composerMode = reduxComposer.composerMode;
  const topic = reduxComposer.topic;
  const tone = reduxComposer.tone;
  const platforms = reduxComposer.selectedPlatforms;
  const inputSource = reduxComposer.inputSource;
  const articleUrl = reduxComposer.articleUrl;
  const emojiDensity = reduxComposer.emojiDensity;
  const hashtagCount = reduxComposer.hashtagCount;
  const formatStyle = reduxComposer.formatStyle;
  const contentLength = reduxComposer.contentLength || 'BALANCED';
  const generatedDrafts = reduxComposer.generatedDrafts;

  const setComposerMode = (mode: 'SINGLE' | 'RECURRING') => dispatch(setComposerModeAction(mode));
  const setTopic = (val: string) => dispatch(setTopicAction(val));
  const setTone = (val: string) => dispatch(setToneAction(val));
  const setInputSource = (src: 'PROMPT' | 'URL') => dispatch(setInputSourceAction(src));
  const setArticleUrl = (val: string) => dispatch(setArticleUrlAction(val));
  const setEmojiDensity = (val: string) => dispatch(setEmojiDensityAction(val));
  const setHashtagCount = (val: string) => dispatch(setHashtagCountAction(val));
  const setFormatStyle = (val: string) => dispatch(setFormatStyleAction(val));
  const setContentLength = (val: string) => dispatch(setContentLengthAction(val));
  const setGeneratedDrafts = (drafts: any) => {
    if (typeof drafts === 'function') {
      const next = drafts(reduxComposer.generatedDrafts);
      dispatch(setAllDraftsAction(next));
    } else {
      dispatch(setAllDraftsAction(drafts));
    }
  };

  // Media Upload States
  const [uploading, setUploading] = useState(false);
  const [mediaFileUrl, setMediaFileUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO' | null>(null);

  // AI Generation States
  const [generating, setGenerating] = useState(false);
  const [aiLimitReached, setAiLimitReached] = useState(false);

  // Fullscreen Preview Popup State
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [portalMounted, setPortalMounted] = useState(false);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreenPreview(false);
      }
    };
    if (isFullscreenPreview) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreenPreview]);

  // Connected Accounts State
  const [connectedPlatforms, setConnectedPlatforms] = useState<PlatformKey[]>([]);
  const [allowedPlatforms, setAllowedPlatforms] = useState<PlatformKey[]>(
    () => PLATFORM_REGISTRY.map((platform) => platform.id)
  );
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [initialChecked, setInitialChecked] = useState(false);

  const [publishNow, setPublishNow] = useState(true);
  const [scheduledDate, setScheduledDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const isFetchingRef = useRef(false);

  const fetchAccounts = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const [accounts, user] = await Promise.all([
        ApiService.getConnectedAccounts(),
        ApiService.getMe(),
      ]);
      if (Array.isArray(accounts)) {
        const activePlatforms = accounts
          .filter((acc: any) => acc.isActive !== false)
          .map((acc: any) => acc.platform.toUpperCase() as PlatformKey);
        setConnectedPlatforms(activePlatforms);
      }
      if (Array.isArray(user?.allowedPlatforms) && user.allowedPlatforms.length > 0) {
        setAllowedPlatforms(user.allowedPlatforms.map((platform) => platform.toUpperCase()));
      }
    } catch (err) {
      console.error('Failed to load connected accounts:', err);
    } finally {
      setLoadingAccounts(false);
      setInitialChecked(true);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    socketClient.connect();

    fetchAccounts();

    // Verify channel statuses via WebSocket immediately on mount
    PLATFORM_REGISTRY.forEach((platform) => {
      socketClient.checkPlatform(platform.id);
    });

    window.addEventListener('focus', fetchAccounts);

    const unsubscribeSocket = socketClient.onAccountStatusChange((payload) => {
      console.log('⚡ [Composer] Socket Account Event Received:', payload);
      fetchAccounts();
      if (payload.platform) {
        socketClient.checkPlatform(payload.platform);
      }
    });

    const unsubscribePlatformStatus = socketClient.onPlatformCheck((payload) => {
      console.log('⚡ [Composer] "check_platform" Socket Response Received:', payload);
      const connected = payload.connected ?? payload.isConnected;
      if (connected) {
        setConnectedPlatforms((prev) => Array.from(new Set([...prev, payload.platform as PlatformKey])));
      } else {
        setConnectedPlatforms((prev) => prev.filter((item) => item !== payload.platform));
      }
      setInitialChecked(true);
    });

    const unsubscribeNotification = socketClient.onNotification((notif) => {
      if (notif.type === 'success') toast.success(notif.message);
      else if (notif.type === 'error' || notif.type === 'warning') toast.error(notif.message);
      else toast.info(notif.message);
    });

    const unsubscribeEvents = accountEvents.subscribe((event) => {
      fetchAccounts();
      if (event.platform) {
        socketClient.checkPlatform(event.platform);
      }
    });

    return () => {
      window.removeEventListener('focus', fetchAccounts);
      unsubscribeSocket();
      unsubscribePlatformStatus();
      unsubscribeNotification();
      unsubscribeEvents();
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

  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleEnhancePrompt = async () => {
    if (!topic || !topic.trim()) {
      toast.error('Please enter a rough thought or topic first (e.g., "AI marketing tips").');
      return;
    }
    setIsEnhancing(true);
    try {
      const result = await ApiService.enhancePrompt(topic, platforms[0] || 'GENERAL', tone);
      if (result.enhancedPrompt) {
        setTopic(result.enhancedPrompt);
        toast.success('Prompt magic-enhanced! Ready to generate.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to enhance prompt.');
    } finally {
      setIsEnhancing(false);
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
          contentLength,
          articleUrl: inputSource === 'URL' ? articleUrl : '',
        }
      );
      if (generated) {
        const draftMap = generated.adaptedPosts || generated;
        setGeneratedDrafts(
          platforms.reduce<Record<string, string>>((drafts, platform) => {
            drafts[platform] = draftMap[platform] || generated[platform] || generated.content || '';
            return drafts;
          }, {})
        );
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
        mediaType: mediaType || null,
        targetPlatforms: platforms,
        scheduledAt: publishNow ? null : (scheduledDate ? new Date(scheduledDate).toISOString() : null),
        publishNow,
      };

      await ApiService.createPost(payload);
      toast.success(publishNow ? 'Post published successfully!' : 'Post scheduled successfully!');
      
      // Reset Form Inputs
      setTopic('');
      setGeneratedDrafts({});
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
    const isSelecting = !platforms.includes(p);
    dispatch(togglePlatformAction(p));

    if (isSelecting) {
      socketClient.checkPlatform(p);
    }
  };

  const handleTextChange = (plt: PlatformKey, val: string) => {
    dispatch(setDraftForPlatformAction({ platform: plt, content: val }));
  };

  const selectablePlatforms = getPlatformDefinitions(allowedPlatforms);
  const mediaRequiredPlatforms = platforms.filter(
    (platform) => getPlatformDefinition(platform).requiresMedia
  );

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Header with Mode Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-900">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-200 tracking-tight">
            Post Composer
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Create, optimize, and schedule social media content across platforms.
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
            Auto-Pilot Schedule
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
                      placeholder="What would you like to post about today? (e.g. 'ai marketing trends')"
                      rows={4}
                      className="w-full bg-slate-955 border border-slate-850 rounded-2xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/60 transition-colors placeholder:text-slate-600 leading-relaxed resize-none"
                    />

                    {/* Magic Enhance Prompt Bar */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={handleEnhancePrompt}
                        disabled={isEnhancing || !topic.trim()}
                        className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-sm"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isEnhancing ? 'animate-spin' : ''}`} />
                        {isEnhancing ? 'Enhancing Prompt...' : '✨ Magic Enhance Prompt'}
                      </button>
                      <span className="text-[10px] text-slate-500">Expands rough thoughts into high-converting prompts</span>
                    </div>

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
                <div className="space-y-4 pt-2 border-t border-slate-850/60">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Target Channels</label>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono font-bold text-slate-500">
                          {platforms.length} of {selectablePlatforms.length}
                        </span>
                        <span className="text-slate-700">·</span>
                        <a href="/accounts" className="text-[10px] text-indigo-400 hover:underline font-semibold flex items-center gap-1">
                          Connect Accounts <ChevronRight className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectablePlatforms.map((platform) => {
                        const active = platforms.includes(platform.id);
                        const isConnected = connectedPlatforms.includes(platform.id);
                        const isVerifying = !initialChecked;

                        return (
                          <button
                            key={platform.id}
                            type="button"
                            onClick={() => togglePlatform(platform.id)}
                            aria-pressed={active}
                            className={`inline-flex items-center gap-2 py-1.5 pl-2.5 pr-3.5 rounded-full border text-[11px] font-extrabold tracking-wide transition-all duration-300 ${
                              active
                                ? isVerifying
                                  ? 'bg-slate-900 text-slate-300 border-slate-800'
                                  : isConnected
                                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                : 'bg-slate-955 text-slate-500 border-slate-850 hover:border-slate-750 hover:text-slate-300'
                            }`}
                            title={
                              isVerifying
                                ? `Verifying ${platform.label}...`
                                : isConnected
                                ? `${platform.label} Connected`
                                : `${platform.label} Not Connected - Click to connect in Social Accounts`
                            }
                          >
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                active
                                  ? isVerifying
                                    ? 'bg-slate-600 animate-pulse'
                                    : isConnected
                                    ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/60'
                                    : 'bg-rose-500 animate-pulse shadow-sm shadow-rose-500/50'
                                  : 'bg-slate-700'
                              }`}
                            />
                            {platform.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Tone</label>
                      <span className="text-[10px] text-slate-500 font-semibold shrink-0">Applied to every selected channel</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {TONE_OPTIONS.map((toneOption) => {
                        const active = tone === toneOption.value;

                        return (
                          <button
                            key={toneOption.value}
                            type="button"
                            onClick={() => setTone(toneOption.value)}
                            aria-pressed={active}
                            title={toneOption.hint}
                            className={`py-1.5 px-3.5 rounded-full border text-[11px] font-extrabold tracking-wide transition-all duration-300 ${
                              active
                                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                                : 'bg-slate-955 text-slate-500 border-slate-850 hover:border-slate-750 hover:text-slate-300'
                            }`}
                          >
                            {toneOption.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Advanced Formatting Controls (Emoji Density, Hashtag Strategy, Format Style, Character Length) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-850/60">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Emoji Density</label>
                    <select
                      value={emojiDensity}
                      onChange={(e) => setEmojiDensity(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-850 rounded-xl px-2.5 py-1.5 text-slate-300 text-[11px] font-medium focus:outline-none focus:border-indigo-500"
                    >
                      <option value="NONE" className="bg-slate-900 text-slate-100 dark:bg-slate-900 dark:text-slate-100">None (0 Emojis)</option>
                      <option value="LOW" className="bg-slate-900 text-slate-100 dark:bg-slate-900 dark:text-slate-100">Subtle (1-2 Emojis)</option>
                      <option value="MEDIUM" className="bg-slate-900 text-slate-100 dark:bg-slate-900 dark:text-slate-100">Balanced (3-5 Emojis)</option>
                      <option value="HIGH" className="bg-slate-900 text-slate-100 dark:bg-slate-900 dark:text-slate-100">Vibrant (Heavy Emojis)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Hashtag Strategy</label>
                    <select
                      value={hashtagCount}
                      onChange={(e) => setHashtagCount(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-850 rounded-xl px-2.5 py-1.5 text-slate-300 text-[11px] font-medium focus:outline-none focus:border-indigo-500"
                    >
                      <option value="NONE" className="bg-slate-900 text-slate-100 dark:bg-slate-900 dark:text-slate-100">No Hashtags</option>
                      <option value="MODERATE" className="bg-slate-900 text-slate-100 dark:bg-slate-900 dark:text-slate-100">Moderate (3-5 Hashtags)</option>
                      <option value="HEAVY" className="bg-slate-900 text-slate-100 dark:bg-slate-900 dark:text-slate-100">Heavy (8-12 Hashtags)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Format Style</label>
                    <select
                      value={formatStyle}
                      onChange={(e) => setFormatStyle(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-850 rounded-xl px-2.5 py-1.5 text-slate-300 text-[11px] font-medium focus:outline-none focus:border-indigo-500"
                    >
                      <option value="SINGLE" className="bg-slate-900 text-slate-100 dark:bg-slate-900 dark:text-slate-100">Standard Post</option>
                      <option value="THREAD" className="bg-slate-900 text-slate-100 dark:bg-slate-900 dark:text-slate-100">Numbered Thread (1/ 2/)</option>
                      <option value="CAROUSEL" className="bg-slate-900 text-slate-100 dark:bg-slate-900 dark:text-slate-100">Slide-by-Slide Outline</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Char Length</label>
                    <select
                      value={contentLength}
                      onChange={(e) => setContentLength(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-850 rounded-xl px-2.5 py-1.5 text-slate-300 text-[11px] font-medium focus:outline-none focus:border-indigo-500"
                    >
                      <option value="CONCISE" className="bg-slate-900 text-slate-100 dark:bg-slate-900 dark:text-slate-100">Concise (~100-250 chars)</option>
                      <option value="BALANCED" className="bg-slate-900 text-slate-100 dark:bg-slate-900 dark:text-slate-100">Balanced (~250-600 chars)</option>
                      <option value="DETAILED" className="bg-slate-900 text-slate-100 dark:bg-slate-900 dark:text-slate-100">Detailed (~600-1500 chars)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAIGenerate}
                  disabled={generating || (inputSource === 'PROMPT' ? !topic : !articleUrl) || platforms.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl font-bold text-xs transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-950/30 cursor-pointer"
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

                {platforms.length === 0 && (
                  <p className="text-[11px] text-amber-400 text-center font-bold mt-2 flex items-center justify-center gap-1.5 animate-fadeIn">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    Please select at least one target channel to generate content.
                  </p>
                )}
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

                {mediaRequiredPlatforms.length > 0 && (
                  <div className="bg-pink-950/20 border border-pink-500/20 rounded-xl p-3 flex items-start gap-2.5">
                    <PlatformIcon platform={mediaRequiredPlatforms[0]} className="h-[18px] w-[18px] text-pink-400 shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-relaxed">
                      <span className="font-bold text-pink-300">Media recommended for {mediaRequiredPlatforms.map((platform) => getPlatformDefinition(platform).label).join(', ')}: </span>
                      <span className="text-slate-400">
                        {mediaFileUrl
                          ? 'Media asset uploaded and ready for every selected channel that supports it.'
                          : 'Add an image or video to improve visual-first channel performance.'}
                      </span>
                    </div>
                  </div>
                )}

                <LiquidUploadButton
                  currentMediaUrl={mediaFileUrl}
                  currentMediaType={mediaType}
                  onMediaSelect={(previewUrl, type) => {
                    setMediaFileUrl(previewUrl);
                    setMediaType(type);
                  }}
                  onUploadSuccess={(url, type) => {
                    setMediaFileUrl(url);
                    setMediaType(type);
                  }}
                  onRemove={() => {
                    setMediaFileUrl('');
                    setMediaType(null);
                  }}
                />
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
                  type="button"
                  onClick={handleSchedulePost}
                  disabled={submitting || (!publishNow && !scheduledDate) || platforms.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-950/30 cursor-pointer"
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
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Feed Preview</h2>
                  <button
                    type="button"
                    onClick={() => setIsFullscreenPreview(true)}
                    className="flex items-center gap-1.5 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 px-2.5 py-1 rounded-lg transition-all active:scale-95 shadow-sm"
                    title="Expand preview to full screen popup"
                  >
                    <Maximize2 className="h-3 w-3" />
                    Full View
                  </button>
                </div>

                {platforms.length === 0 ? (
                  <div className="bg-slate-900/30 border border-slate-850 border-dashed rounded-3xl p-8 text-center space-y-2">
                    <Info className="h-6 w-6 text-slate-600 mx-auto" />
                    <p className="text-slate-500 text-xs font-medium">Select at least one channel above</p>
                  </div>
                ) : (
                  platforms.map((platform) => {
                    const platformDefinition = getPlatformDefinition(platform);
                    const charCount = getCharCount(platform);

                    return (
                      <div key={platform} className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-5 shadow-xl space-y-3 backdrop-blur-md">
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-850">
                          <div className="flex items-center gap-2">
                            <PlatformIcon platform={platform} className={`h-[18px] w-[18px] ${platformDefinition.accentClass}`} />
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300">{platformDefinition.label} Preview</span>
                          </div>

                          {platformDefinition.characterLimit && (
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                              charCount > platformDefinition.characterLimit ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-955 text-slate-500'
                            }`}>
                              {charCount} / {platformDefinition.characterLimit}
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
                            <div className="rounded-xl overflow-hidden border border-slate-850 max-h-48 bg-slate-900 flex items-center justify-center p-1">
                              {mediaType === 'VIDEO' ? (
                                <video src={mediaFileUrl} controls className="w-full max-h-44 object-contain rounded-lg" />
                              ) : (
                                <img
                                  src={mediaFileUrl}
                                  alt="Media Attachment Preview"
                                  className="w-full max-h-44 object-cover rounded-lg"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800';
                                  }}
                                />
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

      {/* FULL SCREEN POPUP PREVIEW OVERLAY MODAL (PORTAL TO DOCUMENT.BODY) */}
      {isFullscreenPreview && portalMounted && createPortal(
        <div className="fixed inset-0 z-[999999] bg-slate-955/85 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-5 md:p-8 overflow-hidden animate-fadeIn">
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-[94vw] max-w-7xl h-[90vh] max-h-[880px] overflow-hidden flex flex-col shadow-2xl shadow-indigo-950/90 my-auto pointer-events-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-850 bg-slate-955/95 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-indigo-600/20 rounded-2xl border border-indigo-500/30 text-indigo-400">
                  <Maximize2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-100 flex items-center gap-2.5">
                    Live Feed Device Preview
                    <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-0.5 rounded-full uppercase tracking-wider font-extrabold">Full Screen</span>
                  </h3>
                  <p className="text-xs text-slate-400">Interactive full-resolution post editor & feed preview across all selected social channels</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFullscreenPreview(false)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Minimize2 className="h-4 w-4" />
                  Close / Minimize View
                </button>
              </div>
            </div>

            {/* Modal Content Grid (Scrollable Container - Strictly Align Top) */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 min-h-0 bg-slate-955/40 custom-scrollbar flex flex-col justify-start">
              {platforms.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-850 border-dashed rounded-3xl p-12 text-center space-y-3 max-w-lg mx-auto my-auto">
                  <Info className="h-10 w-10 text-slate-600 mx-auto" />
                  <p className="text-slate-300 text-base font-bold">No Social Channels Selected</p>
                  <p className="text-slate-500 text-xs">Select one or more target channels above to edit posts in full view.</p>
                </div>
              ) : (
                <div className={`grid gap-6 items-start w-full ${
                  platforms.length === 1
                    ? 'grid-cols-1 w-full max-w-5xl mx-auto'
                    : platforms.length === 2
                    ? 'grid-cols-1 lg:grid-cols-2 w-full'
                    : 'grid-cols-1 lg:grid-cols-3 w-full'
                }`}>
                  {platforms.map((platform) => {
                    const platformDefinition = getPlatformDefinition(platform);
                    const charCount = getCharCount(platform);

                    return (
                      <div key={platform} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 flex flex-col w-full h-full min-h-fit shrink-0">
                        {/* Channel Badge Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-850 shrink-0">
                          <div className="flex items-center gap-3">
                            <PlatformIcon platform={platform} className={`h-7 w-7 ${platformDefinition.accentClass}`} />
                            <span className="text-lg font-extrabold uppercase tracking-wider text-slate-100">{platformDefinition.label} Post Draft</span>
                          </div>

                          {platformDefinition.characterLimit && (
                            <span className={`text-xs font-mono font-extrabold px-3 py-1 rounded-xl ${
                              charCount > platformDefinition.characterLimit ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-955 text-slate-400 border border-slate-850'
                            }`}>
                              {charCount} / {platformDefinition.characterLimit}
                            </span>
                          )}
                        </div>

                        {/* WIDE SPACIOUS TEXTAREA WITH LARGE FONT */}
                        <div className="space-y-6 flex-1 flex flex-col w-full">
                          <div className="space-y-2.5 flex-1 flex flex-col">
                            <label className="text-xs text-indigo-400 font-extrabold uppercase tracking-wider block">
                              Full Post Content & Caption Editor
                            </label>
                            <textarea
                              value={generatedDrafts[platform]}
                              onChange={(e) => handleTextChange(platform, e.target.value)}
                              placeholder={`Type or edit complete content for ${platform} here...`}
                              className="w-full bg-slate-955 border border-slate-800 rounded-2xl p-6 text-base md:text-xl text-slate-100 focus:outline-none focus:border-indigo-500/80 leading-relaxed font-sans min-h-[220px] md:min-h-[280px] max-h-[450px] overflow-y-auto resize-y shadow-inner placeholder:text-slate-600 transition-all font-normal custom-scrollbar"
                            />
                          </div>

                          {/* ATTACHED MEDIA DISPLAY */}
                          {mediaFileUrl && (
                            <div className="space-y-2.5 pt-4 border-t border-slate-850/60 shrink-0">
                              <label className="text-xs text-indigo-400 font-extrabold uppercase tracking-wider block">Attached Media Preview</label>
                              <div className="rounded-2xl overflow-hidden border border-slate-850 bg-slate-955 max-h-[320px] flex items-center justify-center p-3 shadow-md">
                                {mediaType === 'VIDEO' ? (
                                  <video src={mediaFileUrl} controls className="w-full max-h-[290px] object-contain rounded-xl" />
                                ) : (
                                  <img
                                    src={mediaFileUrl}
                                    alt="Attached Media"
                                    className="w-full max-h-[290px] object-contain rounded-xl"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800';
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-850 bg-slate-955/95 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-400 font-medium">Click Minimize or press ESC to return to the main dashboard</span>
              <button
                type="button"
                onClick={() => setIsFullscreenPreview(false)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Minimize2 className="h-4 w-4" />
                Minimize / Close View
              </button>
            </div>
          </div>
        </div>,
        document.body
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
