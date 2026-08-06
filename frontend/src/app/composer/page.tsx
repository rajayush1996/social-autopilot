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
  Minimize2,
  Edit2,
  Trash2,
  Link2,
  Tag as TagIcon,
  Globe,
  Ticket
} from 'lucide-react';
import ApiService from '@/services/apiService';
import CONFIG from '@/config';
import { useToast } from '@/context/ToastContext';
import SchedulingDispatcher from '@/components/SchedulingDispatcher';
import LiquidUploadButton from '@/components/LiquidUploadButton';
import CarouselSlideDeck from '@/components/CarouselSlideDeck';
import PlatformIcon from '@/components/PlatformIcon';
import {
  getPlatformDefinition,
  getPlatformDefinitions,
  PLATFORM_REGISTRY,
  type PlatformId,
  type PlatformDefinition,
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
  { value: 'STORYTELLING', label: 'Storytelling', hint: 'Story Case Study & Product Breakdown' },
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

  // Progressive Disclosure Advanced Options Accordion State
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Custom User Placeholders & Values State (Clean default placeholders with backend sync)
  type UserPlaceholder = { id: string; name: string; value: string };
  const [savedPlaceholders, setSavedPlaceholders] = useState<UserPlaceholder[]>([
    { id: 'def_1', name: 'link', value: '' },
    { id: 'def_2', name: 'name', value: '' },
    { id: 'def_3', name: 'website', value: '' },
    { id: 'def_4', name: 'promo_code', value: '' },
    { id: 'def_5', name: 'author_name', value: '' },
  ]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [showDropdownPopover, setShowDropdownPopover] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tagNameInput, setTagNameInput] = useState('');
  const [tagCategoryInput, setTagCategoryInput] = useState<'link' | 'text' | 'website' | 'code' | 'author' | 'cta'>('link');
  const [tagValueInput, setTagValueInput] = useState('');

  // Fetch persisted placeholders from backend API on mount
  useEffect(() => {
    const fetchPlaceholders = async () => {
      try {
        const res = await ApiService.get('/api/placeholders');
        if (res.data && Array.isArray(res.data.placeholders) && res.data.placeholders.length > 0) {
          setSavedPlaceholders(res.data.placeholders);
          const map: Record<string, string> = {};
          res.data.placeholders.forEach((p: UserPlaceholder) => {
            if (p.value) map[p.name.toUpperCase()] = p.value;
          });
          setVariableValues(map);
        }
      } catch (err) {
        console.warn('[Composer] Could not fetch placeholders from backend:', err);
      }
    };
    fetchPlaceholders();
  }, []);

  // Sync placeholders to backend API
  const syncPlaceholders = async (newList: UserPlaceholder[]) => {
    setSavedPlaceholders(newList);
    const map: Record<string, string> = {};
    newList.forEach((p) => {
      if (p.value) map[p.name.toUpperCase()] = p.value;
    });
    setVariableValues(map);
    try {
      await ApiService.post('/api/placeholders', { placeholders: newList });
    } catch (err) {
      console.warn('[Composer] Could not sync placeholders to backend:', err);
    }
  };

  // RESTful Delete Placeholder Handler
  const handleDeletePlaceholder = async (item: UserPlaceholder) => {
    const updated = savedPlaceholders.filter(p => p.id !== item.id);
    setSavedPlaceholders(updated);
    toast.success(`Deleted {{${item.name}}}`);
    try {
      await ApiService.delete(`/api/placeholders/${item.id}`);
    } catch (err) {
      await syncPlaceholders(updated);
    }
  };

  // RESTful Save/Update Placeholder Handler
  const handleSavePlaceholder = async (cleanKey: string, value: string) => {
    if (editingId) {
      const updated = savedPlaceholders.map(item => item.id === editingId ? { ...item, name: cleanKey, value } : item);
      setSavedPlaceholders(updated);
      toast.success(`Updated {{${cleanKey}}}`);
      setEditingId(null);
      try {
        await ApiService.put(`/api/placeholders/${editingId}`, { name: cleanKey, value });
      } catch (err) {
        await syncPlaceholders(updated);
      }
    } else {
      const newItem: UserPlaceholder = { id: Date.now().toString(), name: cleanKey, value };
      const updated = [...savedPlaceholders, newItem];
      setSavedPlaceholders(updated);
      toast.success(`Added {{${cleanKey}}}`);
      try {
        await ApiService.post('/api/placeholders', { placeholders: updated });
      } catch (err) {
        await syncPlaceholders(updated);
      }
    }
  };

  const getPlaceholderIcon = (name: string) => {
    const key = name.toLowerCase();
    if (key.includes('link') || key.includes('url')) return <Link2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    if (key.includes('web') || key.includes('site') || key.includes('domain')) return <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    if (key.includes('code') || key.includes('promo') || key.includes('coupon')) return <Ticket className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    if (key.includes('author') || key.includes('user') || key.includes('creator')) return <UserIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
    if (key.includes('cta')) return <Zap className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
    return <TagIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
  };

  const toUnicodeBold = (text: string): string => {
    if (!text) return '';
    const normalUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const boldUpper = ['𝗔','𝗕','𝗖','𝗗','𝗘','𝗙','𝗚','𝗛','𝗜','𝗝','𝗞','𝗟','𝗠','𝗡','𝗢','𝗣','𝗤','𝗥','𝗦','𝗧','𝗨','𝗩','𝗪','𝗫','𝗬','𝗭'];
    const normalLower = 'abcdefghijklmnopqrstuvwxyz';
    const boldLower = ['𝗮','𝗯','𝗰','𝗱','𝗲','𝗳','𝗴','𝗵','𝗶','𝗷','𝗸','𝗹','𝗺','𝗻','𝗼','𝗽','𝗾','𝗿','𝘀','𝘁','𝘂','𝘃','𝘄','𝘅','𝘆','𝘇'];
    const normalDigit = '0123456789';
    const boldDigit = ['𝟬','𝟭','𝟮','𝟯','𝟰','𝟱','𝟲','𝟳','𝟴','𝟵'];

    return text
      .split('')
      .map((char) => {
        const uIdx = normalUpper.indexOf(char);
        if (uIdx !== -1) return boldUpper[uIdx];
        const lIdx = normalLower.indexOf(char);
        if (lIdx !== -1) return boldLower[lIdx];
        const dIdx = normalDigit.indexOf(char);
        if (dIdx !== -1) return boldDigit[dIdx];
        return char;
      })
      .join('');
  };

  const toAsciiSimple = (str: string): string => {
    if (!str) return '';
    const boldUpper = ['𝗔','𝗕','𝗖','𝗗','𝗘','𝗙','𝗚','𝗛','𝗜','𝗝','𝗞','𝗟','𝗠','𝗡','𝗢','𝗣','𝗤','𝗥','𝗦','𝗧','𝗨','𝗩','𝗪','𝗫','𝗬','𝗭'];
    const boldLower = ['𝗮','𝗯','𝗰','𝗱','𝗲','𝗳','𝗴','𝗵','𝗶','𝗷','𝗸','𝗹','𝗺','𝗻','𝗼','𝗽','𝗾','𝗿','𝘀','𝘁','𝘂','𝘃','𝘄','𝘅','𝘆','𝘇'];
    const boldDigit = ['𝟬','𝟭','𝟮','𝟯','𝟰','𝟱','𝟲','𝟳','𝟴','𝟵'];

    let res = str;
    boldUpper.forEach((b, i) => { res = res.replaceAll(b, String.fromCharCode(65 + i)); });
    boldLower.forEach((b, i) => { res = res.replaceAll(b, String.fromCharCode(97 + i)); });
    boldDigit.forEach((b, i) => { res = res.replaceAll(b, String.fromCharCode(48 + i)); });
    return res.toLowerCase();
  };

  const formatTagValueForPlatform = (phName: string, rawVal: string, platform: PlatformKey): { formattedVal: string; labelWithPrefix: string } => {
    const val = rawVal.trim();
    const key = phName.toLowerCase();

    // 1. LINK / WEBSITE / CTA -> Visual 🔗 emoji highlight for Instagram, clean URL for LinkedIn/X/Facebook
    if (key.includes('link') || key.includes('url') || key.includes('web') || key.includes('site') || key.includes('cta')) {
      const formattedUrl = val.startsWith('http://') || val.startsWith('https://') ? val : `https://${val}`;
      const formattedVal = platform === 'INSTAGRAM' ? `🔗 ${formattedUrl}` : formattedUrl;
      return {
        formattedVal,
        labelWithPrefix: formattedVal,
      };
    }

    // 2. PROMO CODE / COUPON -> Visual 🎟️ emoji highlight + Unicode Bold for LinkedIn/Facebook
    if (key.includes('code') || key.includes('promo') || key.includes('coupon')) {
      const formattedVal = platform === 'LINKEDIN' || platform === 'FACEBOOK' ? `🎟️ ${toUnicodeBold(val)}` : `🎟️ ${val}`;
      return {
        formattedVal,
        labelWithPrefix: formattedVal,
      };
    }

    // 3. AUTHOR / CREATOR -> Visual ✍️ emoji highlight + Unicode Bold for LinkedIn/Facebook
    if (key.includes('author') || key.includes('creator') || key.includes('user')) {
      const formattedVal = platform === 'LINKEDIN' || platform === 'FACEBOOK' ? `✍️ ${toUnicodeBold(val)}` : `✍️ ${val}`;
      return {
        formattedVal,
        labelWithPrefix: formattedVal,
      };
    }

    // 4. BRAND NAME / TEXT -> Unicode Bold for LinkedIn/Facebook
    const formattedVal = platform === 'LINKEDIN' || platform === 'FACEBOOK' ? toUnicodeBold(val) : val;
    return {
      formattedVal,
      labelWithPrefix: formattedVal,
    };
  };

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
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

  const insertPlaceholderAtCursor = (placeholder: string) => {
    if (!promptTextareaRef.current) {
      setTopic(topic ? `${topic} ${placeholder}` : placeholder);
      return;
    }
    const textarea = promptTextareaRef.current;
    const start = textarea.selectionStart ?? topic.length;
    const end = textarea.selectionEnd ?? topic.length;
    const currentTopic = topic || '';
    const needsSpaceBefore = start > 0 && currentTopic[start - 1] !== ' ';
    const needsSpaceAfter = end < currentTopic.length && currentTopic[end] !== ' ';
    const prefix = needsSpaceBefore ? ' ' : '';
    const suffix = needsSpaceAfter ? ' ' : '';
    const inserted = `${prefix}${placeholder}${suffix}`;
    const newText = currentTopic.substring(0, start) + inserted + currentTopic.substring(end);
    setTopic(newText);
    setTimeout(() => {
      textarea.focus();
      const newPos = start + inserted.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  };

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

        // Auto-sync selected platforms to connected ones so unconnected platforms (like X) don't show preview cards unexpectedly
        if (activePlatforms.length > 0) {
          const currentSelected = reduxComposer.selectedPlatforms || [];
          const validSelected = currentSelected.filter((p) => activePlatforms.includes(p));
          if (validSelected.length > 0) {
            dispatch(setSelectedPlatforms(validSelected));
          } else {
            dispatch(setSelectedPlatforms(activePlatforms));
          }
        } else {
          dispatch(setSelectedPlatforms([]));
        }
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
      // Substitute dynamic variable values in topic prompt before sending to AI
      let finalTopic = topic;
      savedPlaceholders.forEach((ph) => {
        const key = ph.name.toUpperCase();
        const rawVal = (variableValues[key] || ph.value || '').trim();
        if (rawVal) {
          finalTopic = finalTopic.replaceAll(new RegExp(`\\{\\{${ph.name}\\}\\}`, 'gi'), rawVal);
        }
      });

      const generated: any = await ApiService.generateAiContent(
        finalTopic,
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
            let draft = draftMap[platform] || generated[platform] || generated.content || '';

            // Universal Fail-Safe Link Unpacker: converts [anchor](url) or [anchor](www.url) into clean direct https://url
            draft = draft.replace(/\[([^\]]+)\]\(((?:https?:\/\/|www\.)[^\s)]+)\)/gi, (m: any, g1: any, g2: string) => g2.startsWith('www.') ? `https://${g2}` : g2);

            // Strip raw markdown stars for Instagram & X so raw **stars** don't show up in captions
            if (platform === 'INSTAGRAM' || platform === 'X') {
              draft = draft.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
            }

            // 1. In-place substitution of placeholder tags (both standard ASCII {{tag}} and Unicode bold {{𝘁𝗮𝗴}})
            savedPlaceholders.forEach((ph) => {
              const key = ph.name.toUpperCase();
              const rawVal = (variableValues[key] || ph.value || '').trim();
              const phKey = ph.name.toLowerCase();
              const isUrlTag = phKey.includes('link') || phKey.includes('url') || phKey.includes('web') || phKey.includes('site') || phKey.includes('cta');

              if (rawVal) {
                const { formattedVal } = formatTagValueForPlatform(ph.name, rawVal, platform);
                draft = draft.replaceAll(new RegExp(`\\{\\{${ph.name}\\}\\}`, 'gi'), formattedVal);
                // Also clean up any bracketed unicode bold tags left by markdown conversion (e.g. {{𝗽𝗿𝗼𝗺𝗼_𝗰𝗼𝗱𝗲}})
                draft = draft.replace(/\{\{[^}]+\}\}/g, (match: string) => {
                  return match.toLowerCase().includes(ph.name.toLowerCase()) ? formattedVal : match;
                });

                // Format plain text promo codes, authors, and brand names as Unicode bold for LinkedIn & Facebook
                if (!isUrlTag && (platform === 'LINKEDIN' || platform === 'FACEBOOK')) {
                  const boldVal = toUnicodeBold(rawVal);
                  if (draft.includes(rawVal) && !draft.includes(boldVal)) {
                    draft = draft.replaceAll(rawVal, boldVal);
                  }
                }
              }
            });

            // 2. GUARANTEE PRESERVATION: Use toAsciiSimple so Unicode bold values (e.g. 𝗦𝗔𝗩𝗘𝟮𝟬) match ASCII (SAVE20)!
            savedPlaceholders.forEach((ph) => {
              const key = ph.name.toUpperCase();
              const rawVal = (variableValues[key] || ph.value || '').trim();
              const tagInPrompt = topic.toLowerCase().includes(`{{${ph.name.toLowerCase()}}}`);

              const asciiDraft = toAsciiSimple(draft);
              const asciiVal = toAsciiSimple(rawVal);
              const cleanVal = rawVal.replace(/^https?:\/\//i, '').trim();
              const asciiCleanVal = toAsciiSimple(cleanVal);

              const isAlreadyPresent = asciiDraft.includes(asciiVal) || (asciiCleanVal && asciiDraft.includes(asciiCleanVal));

              if (rawVal && tagInPrompt && !isAlreadyPresent) {
                const { labelWithPrefix } = formatTagValueForPlatform(ph.name, rawVal, platform);
                draft += `\n\n${labelWithPrefix}`;
              }
            });

            // Final Fail-Safe: Strip any leftover un-replaced {{...}} tags so no raw brackets leak to post
            draft = draft.replace(/\{\{[^}]+\}\}/g, '').trim();

            drafts[platform] = draft;
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
      let draftText = generatedDrafts[p] || topic;
      // Substitute variable values in final post payload
      Object.entries(variableValues).forEach(([key, val]) => {
        if (val.trim()) {
          draftText = draftText.replaceAll(`{{${key}}}`, val.trim());
        }
      });
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
      
      // Reset Form & Context Inputs
      setTopic('');
      dispatch(setTopicAction(''));
      setGeneratedDrafts({});
      setMediaFileUrl('');
      setMediaType(null);
      setScheduledDate('');
    } catch (err: any) {
      console.error('Scheduling failed:', err);
      toast.error(err.response?.data?.message || 'Failed to schedule post.');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePlatform = (p: PlatformKey) => {
    const isConnected = connectedPlatforms.includes(p);
    if (!isConnected) {
      toast.info(`Please connect your ${p} account in Social Accounts first.`);
      return;
    }
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

  if (!initialChecked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3.5 animate-fadeIn">
        <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center text-[#2563EB]">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div className="text-center space-y-0.5">
          <p className="text-xs font-bold text-[var(--text-primary)]">
            Loading workspace...
          </p>
          <p className="text-[11px] text-[var(--text-secondary)]">
            Verifying connected channels & Smart Tags
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Header with Mode Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--border-color)]">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Post Composer
          </h1>
          <p className="text-[var(--text-secondary)] text-xs mt-1 font-medium">
            Create, optimize, and schedule social media content across platforms.
          </p>
        </div>

        {/* Clean Mode Switcher Tabs */}
        <div className="inline-flex p-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl gap-1.5 shrink-0 shadow-xs">
          <button
            onClick={() => setComposerMode('SINGLE')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
              composerMode === 'SINGLE'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] font-medium'
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
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    1. Enter Topic or AI Prompt
                  </h2>
                  <span className="text-[10px] text-[var(--text-secondary)] font-semibold">Step 1 of 3</span>
                </div>

                {/* Input Source Mode Switcher */}
                <div className="flex items-center gap-2 bg-[var(--bg-input)] p-1 rounded-xl border border-[var(--border-color)]">
                  <button
                    type="button"
                    onClick={() => setInputSource('PROMPT')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      inputSource === 'PROMPT'
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    💬 Custom Topic / Prompt
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputSource('URL')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      inputSource === 'URL'
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    🔗 Repurpose Blog / Article URL
                  </button>
                </div>

                {inputSource === 'URL' ? (
                  <div className="space-y-2">
                    <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Article / Blog Post URL</label>
                    <input
                      type="url"
                      value={articleUrl}
                      onChange={(e) => setArticleUrl(e.target.value)}
                      placeholder="https://yourblog.com/posts/scaling-productivity"
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#2563EB] transition-colors"
                    />
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Additional instructions for repurposing (optional)..."
                      rows={2}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#2563EB] transition-colors leading-relaxed resize-none"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Prompt Header Toolbar with Single Custom Dropdown Popover */}
                    <div className="flex items-center justify-between gap-2 flex-wrap relative">
                      <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                        <PenTool className="w-3.5 h-3.5 text-[#2563EB]" />
                        Prompt Text
                      </label>

                      {/* Single Dropdown Popover Trigger */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setShowDropdownPopover(!showDropdownPopover);
                            setEditingId(null);
                          }}
                          className="bg-[var(--bg-input)] hover:bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] border border-[var(--border-color)] hover:border-[#2563EB] text-[11px] font-bold rounded-xl px-3 py-1.5 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                        >
                          <span>✨ Smart Tags ▾</span>
                          {savedPlaceholders.length > 0 && (
                            <span className="bg-[#2563EB] text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                              {savedPlaceholders.length}
                            </span>
                          )}
                        </button>

                        {/* Custom Dropdown List Popover Panel */}
                        {showDropdownPopover && (
                          <div className="absolute right-0 top-full mt-2 w-84 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl z-50 p-3 space-y-2.5 animate-fadeIn">
                            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                              <span className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] uppercase tracking-wider flex items-center gap-1">
                                ✨ Smart Tags
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowDropdownPopover(false);
                                  setEditingId(null);
                                  setTagNameInput('');
                                  setTagValueInput('');
                                  setShowAddModal(true);
                                }}
                                className="text-[10px] bg-[#2563EB]/10 text-[#2563EB] hover:bg-[#2563EB] hover:text-white px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <span>➕ Add Custom</span>
                              </button>
                            </div>

                            {/* Placeholders List View (Click anywhere on row to select & insert!) */}
                            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                              {savedPlaceholders.map((item) => (
                                <div
                                  key={item.id}
                                  onClick={() => {
                                    insertPlaceholderAtCursor(`{{${item.name}}}`);
                                    toast.success(`Inserted {{${item.name}}}`);
                                    setShowDropdownPopover(false);
                                  }}
                                  className="flex items-center justify-between bg-[var(--bg-input)] hover:bg-[#2563EB]/10 border border-[var(--border-color)] hover:border-[#2563EB]/40 rounded-xl px-3 py-2 transition-all text-xs cursor-pointer group"
                                  title="Click to insert into prompt text"
                                >
                                  <div className="flex items-center gap-2 overflow-hidden mr-2">
                                    {getPlaceholderIcon(item.name)}
                                    <span className="font-mono font-bold text-[#2563EB] dark:text-[#60A5FA] text-[11px] group-hover:underline">
                                      {`{{${item.name}}}`}
                                    </span>
                                    <span className="text-[var(--text-secondary)] text-[10px] truncate font-medium">
                                      {item.value ? `(${item.value})` : '(No value set)'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingId(item.id);
                                        setTagNameInput(item.name);
                                        setTagValueInput(item.value);
                                        setShowDropdownPopover(false);
                                        setShowAddModal(true);
                                      }}
                                      className="p-1 text-[var(--text-secondary)] hover:text-[#2563EB] hover:bg-[var(--bg-card)] rounded-md transition-all cursor-pointer"
                                      title="Edit tag name or value"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeletePlaceholder(item)}
                                      className="p-1 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-all cursor-pointer"
                                      title="Delete tag"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <textarea
                      ref={promptTextareaRef}
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="What would you like to post about?..."
                      rows={4}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#2563EB] transition-colors leading-relaxed resize-none"
                    />

                    {/* Centered Popup Modal for Adding / Editing Custom Placeholder */}
                    {portalMounted && showAddModal && createPortal(
                      <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
                          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                            <span className="text-sm font-bold text-[#2563EB] dark:text-[#60A5FA] uppercase tracking-wider flex items-center gap-2">
                              {editingId ? 'Edit Tag' : 'Add Custom Tag'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddModal(false);
                                setEditingId(null);
                              }}
                              className="text-slate-400 hover:text-slate-200 text-sm font-bold cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>

                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (!tagNameInput.trim()) return;
                              const cleanKey = tagNameInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
                              handleSavePlaceholder(cleanKey, tagValueInput.trim());
                              setTagNameInput('');
                              setTagValueInput('');
                              setShowAddModal(false);
                            }}
                            className="space-y-4"
                          >
                            {/* Tag Type Selector */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block">
                                Type
                              </label>
                              <div className="grid grid-cols-3 gap-2">
                                {[
                                  { id: 'link', label: '🔗 Link', defaultName: 'link' },
                                  { id: 'text', label: '🏷️ Name', defaultName: 'name' },
                                  { id: 'website', label: '🌐 Website', defaultName: 'website' },
                                  { id: 'code', label: '🎟️ Promo Code', defaultName: 'promo_code' },
                                  { id: 'author', label: '✍️ Author', defaultName: 'author_name' },
                                  { id: 'cta', label: '⚡ CTA', defaultName: 'cta_link' },
                                ].map((type) => (
                                  <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => {
                                      setTagCategoryInput(type.id as any);
                                      if (!editingId && !tagNameInput) {
                                        setTagNameInput(type.defaultName);
                                      }
                                    }}
                                    className={`py-2 px-2 rounded-xl text-[11px] font-bold border text-center transition-all cursor-pointer ${
                                      tagCategoryInput === type.id
                                        ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-sm'
                                        : 'bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-[#2563EB]/50'
                                    }`}
                                  >
                                    {type.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Tag Name Input */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block">
                                Tag Name
                              </label>
                              <input
                                type="text"
                                value={tagNameInput}
                                onChange={(e) => setTagNameInput(e.target.value)}
                                placeholder="e.g. link or author"
                                className="w-full text-xs bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#2563EB] font-mono"
                                autoFocus
                              />
                            </div>

                            {/* Replacement Value Input */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block">
                                Value
                              </label>
                              <input
                                type="text"
                                value={tagValueInput}
                                onChange={(e) => setTagValueInput(e.target.value)}
                                placeholder="e.g. https://google.com"
                                className="w-full text-xs bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#2563EB]"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAddModal(false);
                                  setEditingId(null);
                                }}
                                className="px-4 py-2 bg-[var(--bg-input)] hover:bg-[var(--border-color)] text-[var(--text-secondary)] rounded-xl text-xs font-bold transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={!tagNameInput.trim()}
                                className="px-5 py-2 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer shadow-md"
                              >
                                {editingId ? 'Save Edit' : 'Add Tag'}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>,
                      document.body
                    )}

                    {/* Magic Enhance Prompt Bar */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleEnhancePrompt}
                        disabled={isEnhancing || !topic.trim()}
                        className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-sm"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isEnhancing ? 'animate-spin' : ''}`} />
                        {isEnhancing ? 'Enhancing Prompt...' : '✨ Magic Enhance Prompt'}
                      </button>
                      <span className="text-[10px] text-slate-500">Expands rough thoughts while keeping placeholders safe</span>
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
                <div className="space-y-4 pt-3 border-t border-[var(--border-color)]">
                  {/* Target Channels Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Target Channels</label>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono font-bold text-[var(--text-secondary)]">
                          {platforms.length} of {selectablePlatforms.length}
                        </span>
                        <span className="text-[var(--border-color)]">·</span>
                        <a href="/accounts" className="text-[10px] text-[#2563EB] hover:underline font-semibold flex items-center gap-1">
                          Connect Accounts <ChevronRight className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                    {loadingAccounts ? (
                      <div className="flex items-center gap-2 py-1">
                        <div className="h-7 w-28 bg-slate-955 border border-slate-850 rounded-full animate-pulse flex items-center gap-2 px-3">
                          <span className="w-2 h-2 rounded-full bg-indigo-400/80 animate-ping" />
                          <span className="text-[10px] text-slate-400 font-semibold">Checking accounts...</span>
                        </div>
                        <div className="h-7 w-20 bg-slate-955/60 border border-slate-850/60 rounded-full animate-pulse" />
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectablePlatforms.map((platform: PlatformDefinition) => {
                          const isConnected = connectedPlatforms.includes(platform.id);
                          const active = platforms.includes(platform.id as PlatformKey) && isConnected;

                          return (
                            <button
                              key={platform.id}
                              type="button"
                              onClick={() => togglePlatform(platform.id)}
                              aria-pressed={active}
                              className={`inline-flex items-center gap-2 py-1.5 pl-3 pr-3.5 rounded-xl text-[11px] font-bold tracking-wide transition-all duration-200 cursor-pointer border ${
                                active
                                  ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-md'
                                  : 'bg-[var(--bg-input)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-[#2563EB]/50'
                              }`}
                              title={
                                loadingAccounts
                                  ? `Verifying ${platform.label}...`
                                  : isConnected
                                  ? `${platform.label} Connected (Ready to publish)`
                                  : `${platform.label} Not Connected - Click to connect in Social Accounts`
                              }
                            >
                              {/* Explicit Green (Connected) vs Red (Disconnected) Status Dot */}
                              <span
                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                  loadingAccounts
                                    ? 'bg-amber-400 animate-pulse'
                                    : isConnected
                                    ? 'bg-emerald-400 shadow-xs shadow-emerald-400 animate-pulse'
                                    : 'bg-rose-500 shadow-xs shadow-rose-500'
                                }`}
                              />
                              <span>{platform.label}</span>

                              {/* Red / Green Status Badge */}
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded-md font-extrabold uppercase ${
                                  active
                                    ? isConnected
                                      ? 'bg-emerald-400/20 text-emerald-200'
                                      : 'bg-rose-400/30 text-rose-100'
                                    : isConnected
                                    ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
                                    : 'bg-rose-500/10 text-rose-500 dark:text-rose-400'
                                }`}
                              >
                                {isConnected ? 'Active' : 'Offline'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Tone Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Tone</label>
                      <span className="text-[10px] text-[var(--text-secondary)] font-semibold shrink-0">Applied to every selected channel</span>
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
                            className={`py-1.5 px-3.5 rounded-xl text-[11px] font-bold tracking-wide transition-all duration-200 cursor-pointer ${
                              active
                                ? 'bg-[#2563EB] text-white shadow-xs'
                                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[#2563EB]/40'
                            }`}
                          >
                            {toneOption.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Tweak A: Progressive Disclosure Accordion (Hide Emoji, Hashtags, Format Style & Length) */}
                <div className="pt-2 border-t border-[var(--border-color)]">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center justify-between w-full py-2.5 px-3.5 bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-xs"
                  >
                    <span className="flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-[#2563EB]" />
                      Advanced Formatting Settings ⚙️ (Emoji, Hashtags, Format & Length)
                    </span>
                    <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${showAdvanced ? 'rotate-90 text-[#2563EB]' : ''}`} />
                  </button>

                  {showAdvanced && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3.5 mt-2 animate-fadeIn">
                      <div className="space-y-1">
                        <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Emoji Density</label>
                        <select
                          value={emojiDensity}
                          onChange={(e) => setEmojiDensity(e.target.value)}
                          className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-2.5 py-1.5 text-[var(--text-primary)] text-[11px] font-medium focus:outline-none focus:border-[#2563EB]"
                        >
                          <option value="NONE">None (0 Emojis)</option>
                          <option value="LOW">Subtle (1-2 Emojis)</option>
                          <option value="MEDIUM">Balanced (3-5 Emojis)</option>
                          <option value="HIGH">Vibrant (Heavy Emojis)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Hashtags</label>
                        <select
                          value={hashtagCount}
                          onChange={(e) => setHashtagCount(e.target.value)}
                          className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-2.5 py-1.5 text-[var(--text-primary)] text-[11px] font-medium focus:outline-none focus:border-[#2563EB]"
                        >
                          <option value="NONE">0 Tags (No Hashtags)</option>
                          <option value="FEW_3">3 Tags (Minimal Focus)</option>
                          <option value="MODERATE_5">5 Tags (Standard Reach)</option>
                          <option value="GROWTH_8">8 Tags (Growth Boost)</option>
                          <option value="VIRAL_12">12 Tags (Viral Maximum)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Format Style</label>
                        <select
                          value={formatStyle}
                          onChange={(e) => setFormatStyle(e.target.value)}
                          className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-2.5 py-1.5 text-[var(--text-primary)] text-[11px] font-medium focus:outline-none focus:border-[#2563EB]"
                        >
                          <option value="SINGLE">Standard Post</option>
                          <option value="THREAD">Numbered Thread (1/ 2/)</option>
                          <option value="CAROUSEL">Slide-by-Slide Outline</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Char Length</label>
                        <select
                          value={contentLength}
                          onChange={(e) => setContentLength(e.target.value)}
                          className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-2.5 py-1.5 text-[var(--text-primary)] text-[11px] font-medium focus:outline-none focus:border-[#2563EB]"
                        >
                          <option value="CONCISE">Concise (~100-300 chars)</option>
                          <option value="BALANCED">Balanced (~400-1000 chars)</option>
                          <option value="DETAILED">Detailed (~1000-2500 chars)</option>
                          <option value="LONG_FORM">Long-Form Story (~3000-6000 chars)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tweak C: Prominent Bold Primary CTA Button */}
                <button
                  type="button"
                  onClick={handleAIGenerate}
                  disabled={generating || (inputSource === 'PROMPT' ? !topic : !articleUrl) || platforms.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl font-extrabold text-xs transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  {generating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating AI Drafts...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-white" />
                      ✨ Generate Post Preview
                    </>
                  )}
                </button>

                {platforms.length === 0 && (
                  <p className="text-[11px] text-amber-500 text-center font-bold mt-2 flex items-center justify-center gap-1.5 animate-fadeIn">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    Please select at least one target channel to generate content.
                  </p>
                )}
              </div>

              {/* Section 2: Media Attachment Dropzone */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    2. Attach Media (Optional)
                  </h2>
                  <span className="text-[10px] text-[var(--text-secondary)] font-semibold">Step 2 of 3</span>
                </div>

                {mediaRequiredPlatforms.length > 0 && (
                  <div className="bg-pink-500/10 border border-pink-500/30 rounded-xl p-3 flex items-start gap-2.5">
                    <PlatformIcon platform={mediaRequiredPlatforms[0]} className="h-[18px] w-[18px] text-pink-500 shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-relaxed">
                      <span className="font-bold text-pink-500 dark:text-pink-400">Media recommended for {mediaRequiredPlatforms.map((platform: string) => getPlatformDefinition(platform).label).join(', ')}: </span>
                      <span className="text-[var(--text-secondary)]">
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

              {/* Section 3: Publish / Schedule Options */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    3. Publish Options
                  </h2>
                  <span className="text-[10px] text-[var(--text-secondary)] font-semibold">Step 3 of 3</span>
                </div>

                {/* Segmented Control Toggle Tabs */}
                <div className="flex items-center p-1 bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)]">
                  <button
                    type="button"
                    onClick={() => setPublishNow(true)}
                    className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      publishNow
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    ⚡ Publish Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublishNow(false)}
                    className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      !publishNow
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    🗓️ Schedule for Later
                  </button>
                </div>

                {!publishNow && (
                  <div className="space-y-1.5 pt-1 animate-fadeIn">
                    <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Target Date & Time</label>
                    <input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSchedulePost}
                  disabled={submitting || (!publishNow && !scheduledDate) || platforms.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {publishNow ? 'Publishing Campaign Now...' : 'Scheduling Campaign...'}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {publishNow ? '🚀 Publish Campaign Now' : '🗓️ Schedule Campaign'}
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Right Column: Live Feed Previews */}
            <div className="lg:col-span-5 space-y-6">
              <div className="sticky top-6 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Feed Preview & Live Draft Editor</h2>
                    <p className="text-[10px] text-indigo-400/80 font-medium">✏️ Click inside any preview box to edit text or carousel slides before scheduling</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFullscreenPreview(true)}
                    className="flex items-center gap-1.5 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 px-2.5 py-1 rounded-lg transition-all active:scale-95 shadow-sm cursor-pointer"
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
                  platforms.map((platform: PlatformKey) => {
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

                          {formatStyle === 'CAROUSEL' || (generatedDrafts[platform] && /(?:SLIDE|Slide)\s*\d+/i.test(generatedDrafts[platform])) ? (
                            <CarouselSlideDeck
                              text={generatedDrafts[platform]}
                              onTextChange={(newText) => handleTextChange(platform, newText)}
                              platformLabel={platformDefinition.label}
                            />
                          ) : (
                            <textarea
                              value={generatedDrafts[platform]}
                              onChange={(e) => handleTextChange(platform, e.target.value)}
                              placeholder={`Generated text for ${platform} will appear here...`}
                              rows={5}
                              className="w-full bg-transparent border-none p-0 text-xs text-slate-200 focus:outline-none leading-relaxed resize-none"
                            />
                          )}

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
                  {platforms.map((platform: PlatformKey) => {
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
