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
  Ticket,
  MoreHorizontal,
  Bookmark,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import ApiService from '@/services/apiService';
import CONFIG from '@/config';
import { useToast } from '@/context/ToastContext';
import SchedulingDispatcher from '@/components/SchedulingDispatcher';
import LiquidUploadButton from '@/components/LiquidUploadButton';
import CarouselSlideDeck from '@/components/CarouselSlideDeck';
import PlatformIcon from '@/components/PlatformIcon';
import { RichPromptEditor } from '@/components/RichPromptEditor';
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

  const [uploading, setUploading] = useState(false);
  const [mediaFileUrl, setMediaFileUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO' | null>(null);

  const [generating, setGenerating] = useState(false);
  const [aiLimitReached, setAiLimitReached] = useState(false);

  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [portalMounted, setPortalMounted] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Publish Split Button States
  const [publishMode, setPublishMode] = useState<'NOW' | 'SCHEDULE'>('NOW');
  const [showPublishDropdown, setShowPublishDropdown] = useState(false);

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
    if (key.includes('link') || key.includes('url')) return <Link2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    if (key.includes('web') || key.includes('site') || key.includes('domain')) return <Globe className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
    if (key.includes('code') || key.includes('promo') || key.includes('coupon')) return <Ticket className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    if (key.includes('author') || key.includes('user') || key.includes('creator')) return <UserIcon className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
    if (key.includes('cta')) return <Zap className="w-3.5 h-3.5 text-yellow-500 shrink-0" />;
    return <TagIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
  };

  const toUnicodeBold = (text: string): string => {
    if (!text) return '';
    const normalUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const boldUpper = ['𝗔', '𝗕', '𝗖', '𝗗', '𝗘', '𝗙', '𝗚', '𝗛', '𝗜', '𝗝', '𝗞', '𝗟', '𝗠', '𝗡', '𝗢', '𝗣', '𝗤', '𝗥', '𝗦', '𝗧', '𝗨', '𝗩', '𝗪', '𝗫', '𝗬', '𝗭'];
    const normalLower = 'abcdefghijklmnopqrstuvwxyz';
    const boldLower = ['𝗮', '𝗯', '𝗰', '𝗱', '𝗲', '𝗳', '𝗴', '𝗵', '𝗶', '𝗷', '𝗸', '𝗹', '𝗺', '𝗻', '𝗼', '𝗽', '𝗾', '𝗿', '𝘀', '𝘁', '𝘂', '𝘃', '𝘄', '𝘅', '𝘆', '𝘇'];
    const normalDigit = '0123456789';
    const boldDigit = ['𝟬', '𝟭', '𝟮', '𝟯', '𝟰', '𝟱', '𝟲', '𝟳', '𝟴', '𝟵'];

    return text.split('').map((char) => {
      const uIdx = normalUpper.indexOf(char);
      if (uIdx !== -1) return boldUpper[uIdx];
      const lIdx = normalLower.indexOf(char);
      if (lIdx !== -1) return boldLower[lIdx];
      const dIdx = normalDigit.indexOf(char);
      if (dIdx !== -1) return boldDigit[dIdx];
      return char;
    }).join('');
  };

  const toAsciiSimple = (str: string): string => {
    if (!str) return '';
    const boldUpper = ['𝗔', '𝗕', '𝗖', '𝗗', '𝗘', '𝗙', '𝗚', '𝗛', '𝗜', '𝗝', '𝗞', '𝗟', '𝗠', '𝗡', '𝗢', '𝗣', '𝗤', '𝗥', '𝗦', '𝗧', '𝗨', '𝗩', '𝗪', '𝗫', '𝗬', '𝗭'];
    const boldLower = ['𝗮', '𝗯', '𝗰', '𝗱', '𝗲', '𝗳', '𝗴', '𝗵', '𝗶', '𝗷', '𝗸', '𝗹', '𝗺', '𝗻', '𝗼', '𝗽', '𝗾', '𝗿', '𝘀', '𝘁', '𝘂', '𝘃', '𝘄', '𝘅', '𝘆', '𝘇'];
    const boldDigit = ['𝟬', '𝟭', '𝟮', '𝟯', '𝟰', '𝟱', '𝟲', '𝟳', '𝟴', '𝟵'];

    let res = str;
    boldUpper.forEach((b, i) => { res = res.replaceAll(b, String.fromCharCode(65 + i)); });
    boldLower.forEach((b, i) => { res = res.replaceAll(b, String.fromCharCode(97 + i)); });
    boldDigit.forEach((b, i) => { res = res.replaceAll(b, String.fromCharCode(48 + i)); });
    return res.toLowerCase();
  };

  const formatTagValueForPlatform = (phName: string, rawVal: string, platform: PlatformKey) => {
    const val = rawVal.trim();
    const key = phName.toLowerCase();
    if (key.includes('link') || key.includes('url') || key.includes('web') || key.includes('site') || key.includes('cta')) {
      const formattedUrl = val.startsWith('http://') || val.startsWith('https://') ? val : `https://${val}`;
      const formattedVal = platform === 'INSTAGRAM' ? `🔗 ${formattedUrl}` : formattedUrl;
      return { formattedVal, labelWithPrefix: formattedVal };
    }
    if (key.includes('code') || key.includes('promo') || key.includes('coupon')) {
      const formattedVal = platform === 'LINKEDIN' || platform === 'FACEBOOK' ? `🎟️ ${toUnicodeBold(val)}` : `🎟️ ${val}`;
      return { formattedVal, labelWithPrefix: formattedVal };
    }
    if (key.includes('author') || key.includes('creator') || key.includes('user')) {
      const formattedVal = platform === 'LINKEDIN' || platform === 'FACEBOOK' ? `✍️ ${toUnicodeBold(val)}` : `✍️ ${val}`;
      return { formattedVal, labelWithPrefix: formattedVal };
    }
    const formattedVal = platform === 'LINKEDIN' || platform === 'FACEBOOK' ? toUnicodeBold(val) : val;
    return { formattedVal, labelWithPrefix: formattedVal };
  };

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreenPreview(false);
    };
    if (isFullscreenPreview) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreenPreview]);

  // Click outside to close publish dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showPublishDropdown && !(e.target as Element).closest('.publish-dropdown-container')) {
        setShowPublishDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPublishDropdown]);

  const [connectedPlatforms, setConnectedPlatforms] = useState<PlatformKey[]>([]);
  const [allowedPlatforms, setAllowedPlatforms] = useState<PlatformKey[]>(() => PLATFORM_REGISTRY.map((platform) => platform.id));
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [initialChecked, setInitialChecked] = useState(false);

  const [scheduledDate, setScheduledDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const isFetchingRef = useRef(false);

  const insertPlaceholderAtCursor = (placeholder: string) => {
    const currentTopic = topic || '';
    const sel = window.getSelection();
    let insertPos = currentTopic.length;

    if (sel && sel.rangeCount > 0) {
      const editor = document.querySelector('[contentEditable][data-placeholder]');
      if (editor && editor.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        let charIndex = 0;
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (node === range.startContainer) {
            insertPos = charIndex + range.startOffset;
            break;
          }
          charIndex += (node.textContent || '').length;
        }
      }
    }

    const needsSpaceBefore = insertPos > 0 && currentTopic[insertPos - 1] !== ' ';
    const needsSpaceAfter = insertPos < currentTopic.length && currentTopic[insertPos] !== ' ';
    const prefix = needsSpaceBefore ? ' ' : '';
    const suffix = needsSpaceAfter ? ' ' : '';
    const inserted = `${prefix}${placeholder}${suffix}`;
    const newText = currentTopic.substring(0, insertPos) + inserted + currentTopic.substring(insertPos);
    setTopic(newText);
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
    PLATFORM_REGISTRY.forEach((platform) => socketClient.checkPlatform(platform.id));
    window.addEventListener('focus', fetchAccounts);

    const unsubscribeSocket = socketClient.onAccountStatusChange((payload) => {
      fetchAccounts();
      if (payload.platform) socketClient.checkPlatform(payload.platform);
    });

    const unsubscribePlatformStatus = socketClient.onPlatformCheck((payload) => {
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
      if (event.platform) socketClient.checkPlatform(event.platform);
    });

    return () => {
      window.removeEventListener('focus', fetchAccounts);
      unsubscribeSocket();
      unsubscribePlatformStatus();
      unsubscribeNotification();
      unsubscribeEvents();
    };
  }, []);

  const handlePresetSelect = (presetText: string) => setTopic(presetText);
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
      toast.error('Failed to upload file.');
    } finally {
      setUploading(false);
    }
  };

  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleEnhancePrompt = async () => {
    if (!topic || !topic.trim()) {
      toast.error('Please enter a rough thought or topic first.');
      return;
    }
    setIsEnhancing(true);
    try {
      const result = await ApiService.enhancePrompt(topic, platforms[0] || 'GENERAL', tone);
      if (result.enhancedPrompt) {
        setTopic(result.enhancedPrompt);
        toast.success('Prompt magic-enhanced!');
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
      let finalTopic = topic;
      savedPlaceholders.forEach((ph) => {
        const key = ph.name.toUpperCase();
        const rawVal = (variableValues[key] || ph.value || '').trim();
        if (rawVal) {
          finalTopic = finalTopic.replaceAll(new RegExp(`\\{\\{${ph.name}\\}\\}`, 'gi'), rawVal);
        }
      });

      const generated: any = await ApiService.generateAiContent(
        finalTopic, tone, platforms,
        { emojiDensity, hashtagCount, formatStyle, contentLength, articleUrl: inputSource === 'URL' ? articleUrl : '' }
      );

      if (generated) {
        const draftMap = generated.adaptedPosts || generated;
        setGeneratedDrafts(
          platforms.reduce<Record<string, string>>((drafts, platform) => {
            let draft = draftMap[platform] || generated[platform] || generated.content || '';
            draft = draft.replace(/\[([^\]]+)\]\(((?:https?:\/\/|www\.)[^\s)]+)\)/gi, (m: any, g1: any, g2: string) => g2.startsWith('www.') ? `https://${g2}` : g2);

            if (platform === 'INSTAGRAM' || platform === 'X') {
              draft = draft.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
            }

            savedPlaceholders.forEach((ph) => {
              const key = ph.name.toUpperCase();
              const rawVal = (variableValues[key] || ph.value || '').trim();
              const phKey = ph.name.toLowerCase();
              const isUrlTag = phKey.includes('link') || phKey.includes('url') || phKey.includes('web') || phKey.includes('site') || phKey.includes('cta');

              if (rawVal) {
                const { formattedVal } = formatTagValueForPlatform(ph.name, rawVal, platform);
                draft = draft.replaceAll(new RegExp(`\\{\\{${ph.name}\\}\\}`, 'gi'), formattedVal);
                draft = draft.replace(/\{\{[^}]+\}\}/g, (match: string) => match.toLowerCase().includes(ph.name.toLowerCase()) ? formattedVal : match);
                if (!isUrlTag && (platform === 'LINKEDIN' || platform === 'FACEBOOK')) {
                  const boldVal = toUnicodeBold(rawVal);
                  if (draft.includes(rawVal) && !draft.includes(boldVal)) {
                    draft = draft.replaceAll(rawVal, boldVal);
                  }
                }
              }
            });

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

            draft = draft.replace(/\{\{[^}]+\}\}/g, '').trim();
            drafts[platform] = draft;
            return drafts;
          }, {})
        );
        toast.success('AI content generated for selected platforms!');
      }
    } catch (err: any) {
      if (err.response?.status === 429) setAiLimitReached(true);
      else toast.error(err.response?.data?.message || 'Failed to generate content.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSchedulePost = async () => {
    const platformDraftMap: Record<string, string> = {};
    let hasAnyDraft = false;

    platforms.forEach((p) => {
      let draftText = generatedDrafts[p] || topic;
      Object.entries(variableValues).forEach(([key, val]) => {
        if (val.trim()) draftText = draftText.replaceAll(`{{${key}}}`, val.trim());
      });
      if (draftText) {
        platformDraftMap[p] = draftText;
        hasAnyDraft = true;
      }
    });

    if (!hasAnyDraft) {
      toast.error('Post content cannot be empty.');
      return;
    }

    if (publishMode === 'SCHEDULE' && !scheduledDate) {
      toast.error('Please select a date and time to schedule.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        content: JSON.stringify(platformDraftMap),
        mediaUrls: mediaFileUrl ? [mediaFileUrl] : [],
        mediaType: mediaType || null,
        targetPlatforms: platforms,
        scheduledAt: publishMode === 'SCHEDULE' ? new Date(scheduledDate).toISOString() : null,
        publishNow: publishMode === 'NOW',
      };

      await ApiService.createPost(payload);
      toast.success(publishMode === 'NOW' ? 'Post published successfully!' : 'Post scheduled successfully!');

      setTopic('');
      dispatch(setTopicAction(''));
      setGeneratedDrafts({});
      setMediaFileUrl('');
      setMediaType(null);
      setScheduledDate('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to schedule post.');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePlatform = (p: PlatformKey) => {
    const isConnected = connectedPlatforms.includes(p);
    if (!isConnected) {
      toast.info(`Please connect your ${p} account first.`);
      return;
    }
    const isSelecting = !platforms.includes(p);
    dispatch(togglePlatformAction(p));
    if (isSelecting) socketClient.checkPlatform(p);
  };

  const handleTextChange = (plt: PlatformKey, val: string) => {
    dispatch(setDraftForPlatformAction({ platform: plt, content: val }));
  };

  const selectablePlatforms = getPlatformDefinitions(allowedPlatforms);
  const mediaRequiredPlatforms = platforms.filter(p => getPlatformDefinition(p).requiresMedia);

  if (!initialChecked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3.5 animate-fadeIn">
        <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center text-[#2563EB]">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div className="text-center space-y-0.5">
          <p className="text-xs font-bold text-[var(--text-primary)]">Loading workspace...</p>
          <p className="text-[11px] text-[var(--text-secondary)]">Verifying connected channels & Smart Tags</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-fadeIn max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--border-color)]">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">Post Composer</h1>
          <p className="text-[var(--text-secondary)] text-xs mt-1 font-medium">Create, optimize, and schedule social media content across platforms.</p>
        </div>
        <div className="inline-flex p-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl gap-1.5 shadow-sm">
          <button onClick={() => setComposerMode('SINGLE')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 ${composerMode === 'SINGLE' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] font-medium'}`}>
            <PenTool className="h-4 w-4" /> Single Post
          </button>
          <button
            onClick={() => setComposerMode('RECURRING')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 ${composerMode === 'RECURRING'
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] font-medium'
              }`}
          >            <AlarmClock className="h-4 w-4 text-indigo-300" /> Auto-Pilot Schedule
          </button>
        </div>
      </div>

      {composerMode === 'SINGLE' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Main Grid: col-span-5 and col-span-7 layout strictly matches your screenshot proportion */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Left Column (Wider matching the image): Controls */}
            <div className="lg:col-span-7 space-y-6 xl:col-span-7">

              {/* Step 1: Prompt Input */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 md:p-6 space-y-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> 1. Enter Topic or Prompt
                  </h2>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap relative">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                      <PenTool className="w-3.5 h-3.5 text-[#2563EB]" /> Prompt Text
                    </label>

                    {/* Beautiful Smart Tags Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowDropdownPopover(!showDropdownPopover)}
                        className="bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[11px] font-extrabold rounded-lg px-3 py-1.5 transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3 h-3" />
                        Smart Tags {savedPlaceholders.length > 0 && <span className="bg-blue-600 text-white text-[9px] px-1.5 rounded-full ml-1">{savedPlaceholders.length}</span>}
                      </button>

                      {showDropdownPopover && (
                        <div className="absolute right-0 top-full mt-2 w-72 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-xl z-50 p-2 animate-fadeIn overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)] mb-2">
                            <span className="text-xs font-extrabold text-[var(--text-primary)]">Your Variables</span>
                            <button onClick={() => { setShowDropdownPopover(false); setShowAddModal(true); }} className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold">
                              + Add New
                            </button>
                          </div>
                          <div className="max-h-60 overflow-y-auto space-y-1 px-1 custom-scrollbar">
                            {savedPlaceholders.map((item) => (
                              <div key={item.id} className="flex items-center justify-between p-2 hover:bg-[var(--bg-input)] rounded-xl group transition-all cursor-pointer" onClick={() => { insertPlaceholderAtCursor(`{{${item.name}}}`); setShowDropdownPopover(false); }}>
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                    {getPlaceholderIcon(item.name)}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-extrabold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors">{`{{${item.name}}}`}</span>
                                    <span className="text-[9px] text-[var(--text-secondary)] truncate w-32 font-medium">{item.value || 'No value set...'}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={() => { setEditingId(item.id); setTagNameInput(item.name); setTagValueInput(item.value); setShowDropdownPopover(false); setShowAddModal(true); }} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-all"><Edit2 className="w-3 h-3" /></button>
                                  <button onClick={() => handleDeletePlaceholder(item)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md transition-all"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <RichPromptEditor
                    value={topic}
                    onChange={setTopic}
                    placeholder="E.g. {{link}} Write a promotional post about our new feature..."
                    savedPlaceholders={savedPlaceholders}
                    variableValues={variableValues}
                    onUpdateVariableValue={(key, val) => {
                      const map = { ...variableValues };
                      map[key] = val;
                      setVariableValues(map);
                    }}
                    getPlaceholderIcon={getPlaceholderIcon}
                  />

                  <div className="pt-4 border-t border-[var(--border-color)] space-y-4">
                    <div className="space-y-3">
                      <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">
                        Target Channels & Status
                      </label>
                      <div className="flex flex-wrap gap-2.5">
                        {selectablePlatforms.map((platform) => {
                          const isConnected = connectedPlatforms.includes(platform.id);
                          const active = platforms.includes(platform.id as PlatformKey) && isConnected;
                          return (
                            <button
                              key={platform.id}
                              onClick={() => togglePlatform(platform.id)}
                              className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold transition-all border ${active
                                  ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-md'
                                  : 'bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-[#2563EB]/50 hover:bg-[var(--bg-card)]'
                                }`}
                              title={isConnected ? `${platform.label} is Connected` : `${platform.label} is Offline. Click to connect.`}
                            >
                              {/* Glowing Status Dot */}
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${isConnected
                                    ? (active ? 'bg-emerald-300 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]')
                                    : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                                  }`}
                              />

                              {/* Platform Icon & Name */}
                              <div className="flex items-center gap-1.5 border-r border-current pr-2 pb-0.5 pt-0.5 border-opacity-20">
                                <PlatformIcon platform={platform.id} className="w-3.5 h-3.5" />
                                <span>{platform.label}</span>
                              </div>

                              {/* Text Status Badge */}
                              <span className={`text-[9px] px-1 rounded font-extrabold uppercase tracking-widest ${active
                                  ? 'text-blue-100'
                                  : isConnected
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}>
                                {isConnected ? 'Active' : 'Offline'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={handleAIGenerate} disabled={generating || !topic || platforms.length === 0} className="w-full flex items-center justify-center gap-2 py-3 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl font-extrabold text-xs transition-all disabled:opacity-50 shadow-md">
                  {generating ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {generating ? 'Drafting Content...' : 'Generate Preview'}
                </button>
              </div>

              {/* Step 2: Media */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#2563EB] pb-3 border-b border-[var(--border-color)]">
                  <Upload className="h-4 w-4" /> 2. Attach Media
                </div>
                <LiquidUploadButton currentMediaUrl={mediaFileUrl} currentMediaType={mediaType} onMediaSelect={(url, type) => { setMediaFileUrl(url); setMediaType(type); }} onUploadSuccess={(url, type) => { setMediaFileUrl(url); setMediaType(type); }} onRemove={() => { setMediaFileUrl(''); setMediaType(null); }} />
              </div>

              {/* Step 3: Publish Options with Split Dropdown */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm space-y-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#2563EB] pb-3 border-b border-[var(--border-color)]">
                  <Send className="h-4 w-4" /> 3. Publish Options
                </div>

                {publishMode === 'SCHEDULE' && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Target Date & Time</label>
                    <input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl px-4 py-3 text-xs font-bold focus:border-[#2563EB] outline-none"
                    />
                  </div>
                )}

                {/* Integrated Split Button Component */}
                <div className="relative flex shadow-md rounded-xl publish-dropdown-container">
                  <button
                    onClick={handleSchedulePost}
                    disabled={submitting || (publishMode === 'SCHEDULE' && !scheduledDate) || platforms.length === 0}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-l-xl font-extrabold text-[13px] transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Processing...' : publishMode === 'NOW' ? '⚡ Publish Now' : '🗓️ Schedule Post'}
                  </button>
                  <div className="w-[1px] bg-blue-700/50"></div>
                  <button
                    onClick={() => setShowPublishDropdown(!showPublishDropdown)}
                    className="px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-r-xl flex items-center justify-center transition-all disabled:opacity-50"
                  >
                    {showPublishDropdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {/* Dropdown Menu */}
                  {showPublishDropdown && (
                    <div className="absolute right-0 bottom-full mb-2 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl z-50 p-1.5 overflow-hidden animate-fadeIn">
                      <button
                        onClick={() => { setPublishMode('NOW'); setShowPublishDropdown(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${publishMode === 'NOW' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-[var(--text-primary)] hover:bg-[var(--bg-input)]'}`}
                      >
                        <Zap className="w-4 h-4" /> Publish Now
                      </button>
                      <button
                        onClick={() => { setPublishMode('SCHEDULE'); setShowPublishDropdown(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${publishMode === 'SCHEDULE' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-[var(--text-primary)] hover:bg-[var(--bg-input)]'}`}
                      >
                        <Calendar className="w-4 h-4" /> Schedule Later
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Realistic Social Media Preview Feed */}
            <div className="lg:col-span-5 space-y-6 xl:col-span-5">
              <div className="sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Social Feed Preview</h2>
                </div>

                {platforms.length === 0 ? (
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] border-dashed rounded-3xl p-12 text-center space-y-3">
                    <div className="w-12 h-12 bg-[var(--bg-input)] rounded-full flex items-center justify-center mx-auto mb-2"><Info className="h-5 w-5 text-[var(--text-secondary)]" /></div>
                    <p className="text-[var(--text-primary)] text-sm font-bold">No Preview Available</p>
                    <p className="text-[var(--text-secondary)] text-xs">Select target channels and generate drafts to see how they look.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {platforms.map((platform) => (
                      <div key={platform} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md">

                        {/* Mock Header with Full View Button */}
                        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border-color)]/50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-[2px]">
                              <img src="https://ui-avatars.com/api/?name=Brand&background=1e1e1e&color=fff" alt="Avatar" className="w-full h-full rounded-full border-2 border-[var(--bg-card)] object-cover" />
                            </div>
                            <div className="leading-tight">
                              <p className="text-[13px] font-extrabold text-[var(--text-primary)] flex items-center gap-1">Avenar Engineering <CheckCircle2 className="w-3 h-3 text-blue-500" /></p>
                              <p className="text-[11px] text-[var(--text-secondary)] font-medium">@avenar_dev • Just now</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {/* Full View Button Restored Here */}
                            <button
                              onClick={() => setIsFullscreenPreview(true)}
                              className="p-1.5 bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-color)] rounded-lg transition-all text-slate-500 hover:text-blue-500 cursor-pointer"
                              title="Open Full Screen Editor"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                            <PlatformIcon platform={platform} className={`w-5 h-5 opacity-50 ${getPlatformDefinition(platform).accentClass}`} />
                            <MoreHorizontal className="w-4 h-4 text-[var(--text-secondary)] cursor-pointer" />
                          </div>
                        </div>

                        {/* Editable Content Body */}
                        <div className="px-4 py-3 bg-[var(--bg-card)]">
                          <textarea
                            value={generatedDrafts[platform] || ''}
                            onChange={(e) => handleTextChange(platform, e.target.value)}
                            placeholder={`Write your ${getPlatformDefinition(platform).label} caption...`}
                            className="w-full bg-transparent text-[13px] text-[var(--text-primary)] placeholder:text-slate-500 border-none outline-none resize-none leading-relaxed min-h-[80px]"
                            rows={generatedDrafts[platform] ? Math.min(10, generatedDrafts[platform].split('\n').length + 1) : 3}
                          />
                        </div>

                        {/* Attached Media Mockup */}
                        {mediaFileUrl && (
                          <div className="w-full bg-slate-100 dark:bg-slate-900 border-y border-[var(--border-color)]/50 flex items-center justify-center max-h-[350px] overflow-hidden">
                            {mediaType === 'VIDEO' ? (
                              <video src={mediaFileUrl} controls className="w-full object-contain" />
                            ) : (
                              <img src={mediaFileUrl} alt="Preview" className="w-full object-cover" />
                            )}
                          </div>
                        )}

                        {/* Social Action Bar */}
                        <div className="flex items-center justify-between px-5 py-3 text-[var(--text-secondary)] border-t border-[var(--border-color)]/30">
                          <div className="flex items-center gap-6">
                            <Heart className="w-[18px] h-[18px] cursor-pointer hover:text-rose-500 transition-colors" />
                            <MessageSquare className="w-[18px] h-[18px] cursor-pointer hover:text-blue-500 transition-colors" />
                            <Repeat className="w-[18px] h-[18px] cursor-pointer hover:text-green-500 transition-colors" />
                          </div>
                          <div className="flex items-center gap-4">
                            <Bookmark className="w-[18px] h-[18px] cursor-pointer hover:text-amber-500 transition-colors" />
                            <Share2 className="w-[18px] h-[18px] cursor-pointer hover:text-indigo-500 transition-colors" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Full Screen Modal View Logic */}
      {isFullscreenPreview && portalMounted && createPortal(
        <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 md:p-8 overflow-hidden animate-fadeIn">
          <div className="relative bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl w-[94vw] max-w-7xl h-[90vh] max-h-[880px] overflow-hidden flex flex-col shadow-2xl my-auto pointer-events-auto">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-color)] bg-[var(--bg-card)] shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-[#2563EB]/10 rounded-2xl border border-[#2563EB]/20 text-[#2563EB]">
                  <Maximize2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
                    Live Feed Device Preview
                    <span className="text-xs bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20 px-3 py-0.5 rounded-full uppercase tracking-wider font-extrabold">Full Screen</span>
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">Interactive full-resolution post editor & feed preview across all selected channels</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setIsFullscreenPreview(false)} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-extrabold transition-all shadow-md active:scale-95 cursor-pointer">
                  <Minimize2 className="h-4 w-4" /> Close View
                </button>
              </div>
            </div>

            {/* Modal Body (Matches standard App background so cards pop out) */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 min-h-0 bg-[var(--bg-input)] custom-scrollbar flex flex-col justify-start">
              {platforms.length === 0 ? (
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] border-dashed rounded-3xl p-12 text-center space-y-3 max-w-lg mx-auto my-auto shadow-sm">
                  <div className="w-12 h-12 bg-[var(--bg-input)] rounded-full flex items-center justify-center mx-auto mb-2">
                    <Info className="h-5 w-5 text-[var(--text-secondary)]" />
                  </div>
                  <p className="text-[var(--text-primary)] text-base font-bold">No Social Channels Selected</p>
                  <p className="text-[var(--text-secondary)] text-sm">Close this view and select channels to preview drafts.</p>
                </div>
              ) : (
                /* FIX 1: Added 'flex-1 items-stretch' to force grid items to take full height */
                <div className={`flex-1 grid gap-6 items-stretch w-full ${platforms.length === 1 ? 'grid-cols-1 w-full max-w-5xl mx-auto' : platforms.length === 2 ? 'grid-cols-1 lg:grid-cols-2 w-full' : 'grid-cols-1 lg:grid-cols-3 w-full'}`}>
                  {platforms.map((platform: PlatformKey) => {
                    const platformDefinition = getPlatformDefinition(platform);
                    const charCount = getCharCount(platform);
                    return (
                      <div key={platform} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 md:p-8 shadow-sm space-y-6 flex flex-col w-full h-full shrink-0 transition-shadow hover:shadow-md">
                        {/* Editor Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)] shrink-0">
                          <div className="flex items-center gap-3">
                            <PlatformIcon platform={platform} className={`h-7 w-7 ${platformDefinition.accentClass}`} />
                            <span className="text-lg font-extrabold uppercase tracking-wider text-[var(--text-primary)]">{platformDefinition.label} Draft</span>
                          </div>
                          {platformDefinition.characterLimit && (
                            <span className={`text-xs font-mono font-extrabold px-3 py-1 rounded-xl ${charCount > platformDefinition.characterLimit ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-color)]'}`}>
                              {charCount} / {platformDefinition.characterLimit}
                            </span>
                          )}
                        </div>

                        {/* Editor Body */}
                        <div className="space-y-6 flex-1 flex flex-col w-full">
                          <div className="space-y-2.5 flex-1 flex flex-col">
                            <label className="text-xs text-[#2563EB] font-extrabold uppercase tracking-wider block shrink-0">Caption Editor</label>

                            {/* FIX 2: Added 'flex-1 h-full', changed resize-y to resize-none, removed max-h limit */}
                            <textarea
                              value={generatedDrafts[platform] || ''}
                              onChange={(e) => handleTextChange(platform, e.target.value)}
                              placeholder={`Type or edit complete content for ${platform} here...`}
                              className="w-full flex-1 h-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-6 text-base md:text-lg text-[var(--text-primary)] focus:outline-none focus:border-[#2563EB] leading-relaxed font-sans min-h-[300px] overflow-y-auto resize-none shadow-inner placeholder:opacity-50 transition-all font-normal custom-scrollbar"
                            />
                          </div>

                          {/* Attached Media */}
                          {mediaFileUrl && (
                            <div className="space-y-2.5 pt-4 border-t border-[var(--border-color)] shrink-0">
                              <label className="text-xs text-[#2563EB] font-extrabold uppercase tracking-wider block">Attached Media Preview</label>
                              <div className="rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-input)] max-h-[320px] flex items-center justify-center p-3 shadow-sm">
                                {mediaType === 'VIDEO' ? (
                                  <video src={mediaFileUrl} controls className="w-full max-h-[290px] object-contain rounded-xl" />
                                ) : (
                                  <img src={mediaFileUrl} alt="Attached Media" className="w-full max-h-[290px] object-contain rounded-xl" />
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
          </div>
        </div>,
        document.body
      )}

      {portalMounted && showAddModal && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-sm p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <span className="text-sm font-bold text-[#2563EB] flex items-center gap-2">
                {editingId ? 'Edit Smart Tag' : 'Add Smart Tag'}
              </span>
              <button onClick={() => { setShowAddModal(false); setEditingId(null); }} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!tagNameInput.trim()) return;
              const cleanKey = tagNameInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
              handleSavePlaceholder(cleanKey, tagValueInput.trim());
              setTagNameInput(''); setTagValueInput(''); setShowAddModal(false);
            }} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Tag Name</label>
                <input type="text" value={tagNameInput} onChange={(e) => setTagNameInput(e.target.value)} placeholder="e.g. link" className="w-full text-xs bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#2563EB]" autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Value (Optional)</label>
                <input type="text" value={tagValueInput} onChange={(e) => setTagValueInput(e.target.value)} placeholder="e.g. https://google.com" className="w-full text-xs bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#2563EB]" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-[var(--bg-input)] text-[var(--text-secondary)] rounded-xl text-xs font-bold">Cancel</button>
                <button type="submit" disabled={!tagNameInput.trim()} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md">Save</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {composerMode === 'RECURRING' && (
        <div className="animate-fadeIn">
          <SchedulingDispatcher />
        </div>
      )}
    </div>
  );
}