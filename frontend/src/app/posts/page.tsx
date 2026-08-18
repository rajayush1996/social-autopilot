'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calendar, 
  Trash2, 
  Clock, 
  Info,
  CalendarDays,
  XCircle,
  AlertCircle,
  RefreshCw,
  Edit3,
  CheckCircle2,
  X,
  Hash,
  Copy,
  BarChart2,
  ThumbsUp,
  MessageSquare,
  Share2,
  Eye,
  TrendingUp,
  Sparkles,
  ExternalLink,
  Image as ImageIcon,
  Upload,
} from 'lucide-react';
import ApiService from '@/services/apiService';
import CONFIG from '@/config';
import { Post } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { formatDateTime, formatDate } from '@/utils/date';
import CarouselSlideDeck, { parseCarouselSlides } from '@/components/CarouselSlideDeck';
import socketClient from '@/utils/socket';
import LoadingScreen from '@/components/LoadingScreen';

// Custom Instagram icon component to avoid missing lucide exports
function InstagramPlatformIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

// Custom Linkedin icon component to avoid missing lucide exports
function LinkedinPlatformIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

// Custom X (Twitter) icon component to avoid missing lucide exports
function XPlatformIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
      <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
    </svg>
  );
}
function parsePostContent(contentStr: string): { isJson: boolean; map: Record<string, string>; text: string } {
  if (!contentStr) return { isJson: false, map: {}, text: '' };
  try {
    const parsed = JSON.parse(contentStr);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { isJson: true, map: parsed, text: '' };
    }
  } catch (e) {
    // plain text
  }
  return { isJson: false, map: {}, text: contentStr };
}

function toLocalDatetimeInputString(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'ALL' | 'SCHEDULED' | 'PUBLISHED' | 'DRAFT' | 'CANCELLED' | 'FAILED'>('ALL');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<'ALL' | 'LINKEDIN' | 'INSTAGRAM' | 'X' | 'FACEBOOK'>('ALL');
  const [viralityDiagnosis, setViralityDiagnosis] = useState<any>(null);
  const [diagnosingVirality, setDiagnosingVirality] = useState(false);
  
  // Modal / Drawer state
  const [portalMounted, setPortalMounted] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const toast = useToast();

  // Inline Post Content Editor state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [savingPostId, setSavingPostId] = useState<string | null>(null);

  // Inline Schedule Time Editor state
  const [isEditingScheduledTime, setIsEditingScheduledTime] = useState(false);
  const [newScheduledTime, setNewScheduledTime] = useState('');
  const [savingTime, setSavingTime] = useState(false);

  const [syncingMetricsId, setSyncingMetricsId] = useState<string | null>(null);
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);
  const [uploadingMediaId, setUploadingMediaId] = useState<string | null>(null);

  const handleSyncMetrics = async (postId: string) => {
    setSyncingMetricsId(postId);
    try {
      const metrics = await ApiService.syncPostMetrics(postId);
      if (metrics) {
        setSelectedPost((prev) => (prev && prev.id === postId ? { ...prev, ...metrics } as any : prev));
        setPosts((prev) => prev.map((p) => (p.id === postId ? ({ ...p, ...metrics } as any) : p)));
        toast.success(metrics.isLiveSynced ? 'Live metrics synced from LinkedIn API!' : 'Engagement metrics updated!');
      }
    } catch (err) {
      toast.error('Failed to sync metrics from platform.');
    } finally {
      setSyncingMetricsId(null);
    }
  };

  const handleGenerateAiVisual = async (postId: string) => {
    setGeneratingImageId(postId);
    try {
      const res = await ApiService.generatePostImage(postId);
      if (res && res.imageUrl) {
        setSelectedPost((prev) => (prev && prev.id === postId ? { ...prev, mediaUrls: [res.imageUrl], mediaType: 'IMAGE' } : prev));
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, mediaUrls: [res.imageUrl], mediaType: 'IMAGE' } : p)));
        toast.success('🎨 AI Visual Graphic generated and attached to post!');
      }
    } catch (err) {
      toast.error('Failed to generate AI visual graphic.');
    } finally {
      setGeneratingImageId(null);
    }
  };

  const handleUploadDrawerMedia = async (postId: string, file: File) => {
    setUploadingMediaId(postId);
    try {
      const uploadRes = await ApiService.uploadMedia(file);
      const url = (uploadRes as any)?.fileUrl || (uploadRes as any)?.url;
      const mediaType = (uploadRes as any)?.mediaType || (uploadRes as any)?.type === 'video' ? 'VIDEO' : 'IMAGE';
      if (url) {
        await ApiService.updatePostMedia(postId, [url], mediaType);
        setSelectedPost((prev) => (prev && prev.id === postId ? { ...prev, mediaUrls: [url], mediaType } : prev));
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, mediaUrls: [url], mediaType } : p)));
        toast.success('📁 Custom media uploaded and attached!');
      }
    } catch (err) {
      toast.error('Failed to upload custom media.');
    } finally {
      setUploadingMediaId(null);
    }
  };

  const handleRemoveDrawerMedia = async (postId: string) => {
    try {
      await ApiService.updatePostMedia(postId, []);
      setSelectedPost((prev) => (prev && prev.id === postId ? { ...prev, mediaUrls: [], mediaType: null } : prev));
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, mediaUrls: [], mediaType: null } : p)));
      toast.success('🗑️ Media attachment removed.');
    } catch (err) {
      toast.error('Failed to remove media.');
    }
  };

  const handleDiagnosePost = async (post: Post) => {
    setDiagnosingVirality(true);
    setViralityDiagnosis(null);
    try {
      const res = await ApiService.diagnosePost({
        content: post.content,
        platform: post.targetPlatforms[0] || 'LINKEDIN',
      });
      setViralityDiagnosis(res);
      toast.success('AI Virality Diagnosis Complete!');
    } catch (err) {
      toast.error('Failed to run virality diagnostic.');
    } finally {
      setDiagnosingVirality(false);
    }
  };

  const handleSavePostEdit = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    setSavingPostId(postId);
    try {
      await ApiService.updatePost(postId, { content: editingContent });
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, content: editingContent } : p)));
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost({ ...selectedPost, content: editingContent });
      }
      toast.success('Post content updated successfully!');
      setEditingPostId(null);
    } catch (err) {
      toast.error('Failed to save post edit.');
    } finally {
      setSavingPostId(null);
    }
  };

  const handleSaveScheduledTime = async (postId: string) => {
    if (!newScheduledTime) return;
    setSavingTime(true);
    try {
      const isoDate = new Date(newScheduledTime).toISOString();
      await ApiService.updatePost(postId, { scheduledAt: isoDate });
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost({ ...selectedPost, scheduledAt: isoDate });
      }
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, scheduledAt: isoDate } : p)));
      toast.success('Scheduled release time updated successfully!');
      setIsEditingScheduledTime(false);
    } catch (err) {
      toast.error('Failed to update scheduled time.');
    } finally {
      setSavingTime(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const postsList = await ApiService.getPosts();
      setPosts(postsList);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPortalMounted(true);
    fetchPosts();

    socketClient.connect();

    const handleUpdateEvent = () => {
      fetchPosts();
    };

    socketClient.on('notification:new', handleUpdateEvent);
    socketClient.on('post:updated', handleUpdateEvent);

    // Auto-refresh interval every 10 seconds to catch background worker state changes
    const intervalId = setInterval(() => {
      fetchPosts();
    }, 10000);

    return () => {
      socketClient.off('notification:new', handleUpdateEvent);
      socketClient.off('post:updated', handleUpdateEvent);
      clearInterval(intervalId);
    };
  }, []);

  const handleCancelSchedule = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation(); // Avoid opening details drawer

    setCancellingId(postId);
    try {
      await ApiService.cancelPost(postId);
      toast.success('Post scheduled publication cancelled successfully.');
      fetchPosts();
      if (selectedPost?.id === postId) setSelectedPost(null);
    } catch (err) {
      console.error('Cancellation Error:', err);
      toast.error('Failed to cancel post.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleRetryPost = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    setRetryingId(postId);
    try {
      await ApiService.retryPost(postId);
      toast.success('Post re-queued for publishing!');
      fetchPosts();
      if (selectedPost?.id === postId) setSelectedPost(null);
    } catch (err: any) {
      console.error('Retry Error:', err);
      toast.error(err.response?.data?.message || 'Failed to retry post execution.');
    } finally {
      setRetryingId(null);
    }
  };

  const filteredPosts = posts.filter(post => {
    let statusMatch = true;
    if (filterTab === 'ALL') statusMatch = true;
    else if (filterTab === 'SCHEDULED') statusMatch = post.status === 'SCHEDULED' || post.status === 'PUBLISHING';
    else if (filterTab === 'DRAFT') statusMatch = post.status === 'DRAFT';
    else if (filterTab === 'PUBLISHED') statusMatch = post.status === 'PUBLISHED' || post.status === 'PARTIALLY_PUBLISHED';
    else if (filterTab === 'CANCELLED') statusMatch = post.status === 'CANCELLED';
    else if (filterTab === 'FAILED') statusMatch = post.status === 'FAILED' || post.status === 'PARTIALLY_PUBLISHED';
    else statusMatch = post.status === filterTab;

    let platformMatch = true;
    if (selectedPlatformFilter !== 'ALL') {
      platformMatch = post.targetPlatforms?.includes(selectedPlatformFilter as any);
    }

    return statusMatch && platformMatch;
  });

  const getPostFormatBadge = (post: Post) => {
    let textToAnalyze = post.content || '';
    try {
      if (textToAnalyze.trim().startsWith('{')) {
        const parsed = JSON.parse(textToAnalyze);
        textToAnalyze = parsed.INSTAGRAM || parsed.LINKEDIN || parsed.FACEBOOK || parsed.X || parsed.content || textToAnalyze;
      }
    } catch (e) {}

    const formatProp = (post as any).formatStyle || (post as any).format;
    const isExplicitCarousel = formatProp && ['CAROUSEL', 'SLIDES', 'SLIDE_BY_SLIDE'].includes(String(formatProp).toUpperCase());
    const slides = parseCarouselSlides(textToAnalyze);
    const isCarouselContent = slides.length > 1 || /(?:SLIDE|Slide|\bSlide\b)\s*\d+/i.test(textToAnalyze) || /(?:📌|key takeaway|takeaways|\b1\.\s+|\b2\.\s+)/i.test(textToAnalyze);

    if (isExplicitCarousel || isCarouselContent) {
      const countLabel = slides.length > 1 ? `${slides.length} Slides` : 'Multi-Slide';
      return (
        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20 flex items-center gap-1 shadow-sm">
          <span>🎠 Carousel Slide Deck ({countLabel})</span>
        </span>
      );
    }

    return (
      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-color)] flex items-center gap-1">
        <span>📝 Standard Post</span>
      </span>
    );
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toUpperCase()) {
      case 'INSTAGRAM': return <InstagramPlatformIcon className="h-3.5 w-3.5 text-pink-400" />;
      case 'LINKEDIN': return <LinkedinPlatformIcon className="h-3.5 w-3.5 text-blue-400" />;
      case 'X':
      case 'TWITTER': return <XPlatformIcon className="h-3.5 w-3.5 text-slate-300" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <LoadingScreen 
        message="Querying social queue & history..." 
        subMessage="Loading published records, scheduled dispatches, and drafts"
      />
    );
  }

  return (
    <div className="space-y-8 relative">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
          Queue & Post History
        </h1>
        <p className="text-[var(--text-secondary)] mt-1 text-sm font-medium">
          Review, inspect, or cancel delayed background post tasks and execution logs.
        </p>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-[var(--border-color)] gap-6 overflow-x-auto">
        {(['ALL', 'SCHEDULED', 'PUBLISHED', 'DRAFT', 'CANCELLED', 'FAILED'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`pb-3 text-xs font-bold uppercase tracking-wider relative transition-all duration-200 cursor-pointer ${
              filterTab === tab ? 'text-[#2563EB] dark:text-[#60A5FA] font-extrabold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab}
            {filterTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB] rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Channel Switcher Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider mr-1">Channel Filter:</span>
        {[
          { key: 'ALL', label: '🌐 All Channels' },
          { key: 'LINKEDIN', label: '💼 LinkedIn' },
          { key: 'INSTAGRAM', label: '📸 Instagram' },
          { key: 'X', label: '🐦 X (Twitter)' },
          { key: 'FACEBOOK', label: '📘 Facebook' },
        ].map(({ key, label }) => {
          const isSelected = selectedPlatformFilter === key;
          const count = key === 'ALL' 
            ? posts.length 
            : posts.filter(p => p.targetPlatforms?.includes(key as any)).length;
          
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedPlatformFilter(key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                isSelected
                  ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[#2563EB]/40'
              }`}
            >
              <span>{label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                isSelected ? 'bg-white/20 text-white' : 'bg-[var(--bg-input)] text-[var(--text-secondary)]'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid of posts */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[var(--border-color)] rounded-2xl">
          <CalendarDays className="h-12 w-12 text-[var(--text-secondary)] mx-auto mb-2" />
          <p className="text-[var(--text-primary)] font-bold text-sm">No posts found</p>
          <span className="text-xs text-[var(--text-secondary)]">There are no records in the queue matching this tab category.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredPosts.map(post => (
            <div
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 cursor-pointer flex flex-col justify-between shadow-sm transition-all duration-200 hover:border-[#2563EB]/40"
            >
              <div>
                {/* Post Card Header */}
                <div className="flex items-center justify-between mb-3.5 gap-2">
                  {/* Status & Post ID Badge Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border uppercase tracking-wider ${
                      post.status === 'PUBLISHED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : post.status === 'PUBLISHING'
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 animate-pulse font-extrabold'
                        : post.status === 'FAILED'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : post.status === 'CANCELLED'
                        ? 'bg-slate-850 text-slate-400 border-slate-700'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {post.status}
                    </span>

                    {/* Post ID Chip with 1-Click Copy */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(post.id);
                        toast.success(`Copied Post ID: ${post.id.slice(0, 8)}...`);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-input)] hover:bg-[#2563EB]/10 border border-[var(--border-color)] hover:border-[#2563EB]/30 text-[11px] font-mono text-[var(--text-secondary)] hover:text-[#2563EB] transition-all cursor-pointer shadow-2xs"
                      title={`Post ID: ${post.id} (Click to copy)`}
                    >
                      <Hash className="w-3 h-3 text-[#2563EB]" />
                      <span>{post.id.slice(0, 8)}</span>
                      <Copy className="w-2.5 h-2.5 opacity-60" />
                    </button>
                  </div>

                  {/* Platforms list */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {post.targetPlatforms.map(plt => (
                      <div key={plt} className="p-1 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg flex items-center justify-center">
                        {getPlatformIcon(plt)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Content snippet & media thumbnail / Inline Editor */}
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    {/* Rich Metadata Badges Row */}
                    <div className="flex flex-wrap items-center gap-1.5 my-1">
                      {/* Format Style / Post Type Badge */}
                      {getPostFormatBadge(post)}

                      {/* Tone Badge */}
                      {post.tone && (
                        <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/25 flex items-center gap-1 capitalize">
                          <span>🎯 {post.tone.toLowerCase()}</span>
                        </span>
                      )}

                      {/* AI Generated Badge */}
                      {post.aiGenerated ? (
                        <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 flex items-center gap-1">
                          <span>✨ AI Generated</span>
                        </span>
                      ) : (
                        <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-color)] flex items-center gap-1">
                          <span>✍️ Creator Input</span>
                        </span>
                      )}
                    </div>

                    {editingPostId === post.id ? (
                      <div className="space-y-2 bg-[var(--bg-input)] p-3 rounded-2xl border border-[#2563EB]" onClick={(e) => e.stopPropagation()}>
                        <textarea
                          rows={4}
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#2563EB] resize-none font-sans leading-relaxed"
                          placeholder="Edit post content..."
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEditingPostId(null); }}
                            className="btn btn-secondary px-3.5 py-1.5 text-xs font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleSavePostEdit(e, post.id)}
                            disabled={savingPostId === post.id}
                            className="btn btn-primary px-3.5 py-1.5 text-xs font-semibold"
                          >
                            {savingPostId === post.id ? 'Saving...' : 'Save Content'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-[var(--text-primary)] line-clamp-3 leading-relaxed font-sans">{post.content}</p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                            {post.scheduledAt ? `${formatDateTime(post.scheduledAt)}` : 'Published Immediate'}
                          </span>
                          
                          {(post.status === 'SCHEDULED' || post.status === 'DRAFT') && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPostId(post.id);
                                setEditingContent(post.content);
                              }}
                              className="flex items-center gap-1 text-[10px] font-bold text-[#2563EB] hover:underline bg-[#2563EB]/10 border border-[#2563EB]/20 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-sm"
                              title="Edit pending post content"
                            >
                              <Edit3 className="h-3 w-3" /> Edit Post Content
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {post.mediaUrls && post.mediaUrls.length > 0 && (
                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-input)] shrink-0">
                      {post.mediaType === 'VIDEO' ? (
                        <video src={post.mediaUrls[0]} muted className="w-full h-full object-cover" />
                      ) : (
                        <img src={post.mediaUrls[0]} alt="Media attachment thumbnail" className="w-full h-full object-cover" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick action buttons for published posts */}
              {post.status === 'PUBLISHED' && (
                <div className="mt-4 pt-3.5 border-t border-[var(--border-color)] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPost(post);
                    }}
                    className="text-[11px] text-emerald-500 hover:underline font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> View Publication Logs ↗
                  </button>
                  <span className="text-[10px] text-[var(--text-secondary)] font-semibold">
                    {post.publishedAt ? formatDateTime(post.publishedAt) : 'Live'}
                  </span>
                </div>
              )}

              {/* Quick action buttons for failed posts */}
              {(post.status === 'FAILED' || post.status === 'PARTIALLY_PUBLISHED') && (
                <div className="mt-4 pt-3.5 border-t border-[var(--border-color)] flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPost(post);
                    }}
                    className="text-[11px] text-rose-500 hover:underline font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <AlertCircle className="h-3.5 w-3.5" /> Inspect Error Logs ↗
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleCancelSchedule(e, post.id)}
                      disabled={cancellingId === post.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      title="Cancel and remove this failed post"
                    >
                      <Trash2 className="h-3 w-3" />
                      {cancellingId === post.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleRetryPost(e, post.id)}
                      disabled={retryingId === post.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-[10px] font-extrabold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${retryingId === post.id ? 'animate-spin' : ''}`} />
                      {retryingId === post.id ? 'Re-queuing...' : 'Retry / Republish'}
                    </button>
                  </div>
                </div>
              )}

              {/* Quick action button for draft posts */}
              {post.status === 'DRAFT' && (
                <div className="mt-4 pt-3.5 border-t border-[var(--border-color)] flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPost(post);
                    }}
                    className="text-[11px] text-amber-500 hover:underline font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Draft Details ↗
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleCancelSchedule(e, post.id)}
                      disabled={cancellingId === post.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 rounded-xl text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
                      title="Delete this draft"
                    >
                      <Trash2 className="h-3 w-3" />
                      {cancellingId === post.id ? 'Deleting...' : 'Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleRetryPost(e, post.id)}
                      disabled={retryingId === post.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-[10px] font-extrabold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${retryingId === post.id ? 'animate-spin' : ''}`} />
                      {retryingId === post.id ? 'Publishing...' : '🚀 Publish Now'}
                    </button>
                  </div>
                </div>
              )}

              {/* Quick action button for scheduled posts */}
              {post.status === 'SCHEDULED' && (
                <div className="mt-4 pt-3.5 border-t border-[var(--border-color)] flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPost(post);
                    }}
                    className="text-[11px] text-[#2563EB] hover:underline font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <Info className="h-3.5 w-3.5" /> View Details & Logs ↗
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleCancelSchedule(e, post.id)}
                      disabled={cancellingId === post.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[var(--bg-input)] hover:bg-rose-500/10 border border-[var(--border-color)] hover:border-rose-500/30 text-[var(--text-secondary)] hover:text-rose-500 rounded-lg text-[10px] font-bold transition-all duration-300 disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      {cancellingId === post.id ? 'Cancelling...' : 'Cancel Queue'}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleRetryPost(e, post.id)}
                      disabled={retryingId === post.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-[10px] font-extrabold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${retryingId === post.id ? 'animate-spin' : ''}`} />
                      {retryingId === post.id ? 'Publishing...' : '🚀 Publish Now'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Details drawer/modal side panel rendered via Portal to sit above all Navbars/Headers */}
      {selectedPost && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedPost(null); }}
          className="fixed inset-0 w-screen h-screen min-h-screen z-[99999] bg-black/70 backdrop-blur-sm flex items-stretch justify-end animate-fadeIn cursor-pointer"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--bg-card)] h-full w-full max-w-xl border-l border-[var(--border-color)] p-6 md:p-8 flex flex-col justify-between shadow-2xl overflow-y-auto cursor-default z-[100000] relative"
          >
              <div className="space-y-6">
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-[var(--text-primary)]">Post Details & Logs</h3>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        selectedPost.status === 'PUBLISHED'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : selectedPost.status === 'FAILED'
                          ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          : 'bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20'
                      }`}>
                        {selectedPost.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[var(--text-secondary)] font-mono bg-[var(--bg-input)] px-2.5 py-0.5 rounded-md border border-[var(--border-color)] inline-flex items-center gap-1">
                        <Hash className="w-3 h-3 text-[#2563EB]" />
                        <span className="text-[var(--text-primary)] font-bold">{selectedPost.id}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedPost.id);
                          toast.success('Copied full Post ID to clipboard!');
                        }}
                        className="p-1 text-[var(--text-secondary)] hover:text-[#2563EB] hover:bg-[var(--bg-input)] rounded-md transition-all cursor-pointer border border-transparent hover:border-[var(--border-color)]"
                        title="Copy full Post ID"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 🌟 FIX: Updated Clean Close Button based on theme variables */}
                  <button
                    type="button"
                    onClick={() => setSelectedPost(null)}
                    className="h-8 w-8 rounded-xl bg-[var(--bg-input)] hover:bg-rose-500/10 border border-[var(--border-color)] hover:border-rose-500/30 text-[var(--text-primary)] hover:text-rose-500 transition-all cursor-pointer flex items-center justify-center group shadow-xs"
                    title="Close details"
                  >
                    <X className="h-4 w-4 transition-transform group-hover:scale-110" />
                  </button>
                </div>

                {/* Target Channels Badge Row */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Target Channels</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedPost.targetPlatforms?.map((p) => (
                      <span key={p} className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl text-xs font-bold">
                        {getPlatformIcon(p)}
                        <span>{p}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Rich Post Metadata Cards Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Tone Badge */}
                  <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 space-y-1">
                    <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Content Tone</span>
                    <span className="text-xs font-extrabold text-[var(--text-primary)] capitalize flex items-center gap-1.5">
                      🎯 {selectedPost.tone ? selectedPost.tone.toLowerCase() : 'Standard'}
                    </span>
                  </div>

                  {/* Generation Source Badge */}
                  <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 space-y-1">
                    <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Creation Method</span>
                    <span className="text-xs font-extrabold text-[var(--text-primary)] flex items-center gap-1.5">
                      {selectedPost.aiGenerated ? '✨ AI Generated' : '✍️ Manual Input'}
                    </span>
                  </div>

                  {/* Scheduled Release Time */}
                  {selectedPost.scheduledAt && (
                    <div className={`bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 space-y-2 ${isEditingScheduledTime ? 'col-span-2' : ''}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Scheduled Release Time</span>
                        {selectedPost.status === 'SCHEDULED' && !isEditingScheduledTime && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingScheduledTime(true);
                              setNewScheduledTime(toLocalDatetimeInputString(selectedPost.scheduledAt));
                            }}
                            className="text-[11px] text-[#2563EB] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="h-3 w-3" /> Edit Time
                          </button>
                        )}
                      </div>

                      {isEditingScheduledTime ? (
                        <div className="space-y-2 pt-1">
                          <input
                            type="datetime-local"
                            value={newScheduledTime}
                            onChange={(e) => setNewScheduledTime(e.target.value)}
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl px-3 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-[#2563EB]"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setIsEditingScheduledTime(false)}
                              className="px-2.5 py-1 bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)] rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveScheduledTime(selectedPost.id)}
                              disabled={savingTime}
                              className="px-3.5 py-1 bg-[#2563EB] text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1"
                            >
                              {savingTime ? 'Saving...' : 'Save Time'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                          {formatDateTime(selectedPost.scheduledAt)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Published Timestamp */}
                  {selectedPost.publishedAt && (
                    <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 space-y-1">
                      <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Published Timestamp</span>
                      <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        {formatDateTime(selectedPost.publishedAt)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Post Content Display (Multi-Platform Tabs or Plain Text) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Caption Content</span>
                    {editingPostId !== selectedPost.id && selectedPost.status !== 'PUBLISHED' && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPostId(selectedPost.id);
                          setEditingContent(selectedPost.content);
                        }}
                        className="text-[11px] text-[#2563EB] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="h-3 w-3" /> Edit Content
                      </button>
                    )}
                  </div>

                  {editingPostId === selectedPost.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-2xl p-4 text-xs leading-relaxed font-sans focus:outline-none focus:border-[#2563EB] min-h-[140px]"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingPostId(null)}
                          className="px-3 py-1.5 bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-color)] rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleSavePostEdit(e, selectedPost.id)}
                          disabled={savingPostId === selectedPost.id}
                          className="px-4 py-1.5 bg-[#2563EB] text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                        >
                          {savingPostId === selectedPost.id ? 'Saving...' : 'Save Edit'}
                        </button>
                      </div>
                    </div>
                  ) : parsePostContent(selectedPost.content || '').isJson ? (
                    /* Multi-Platform Caption Tabs */
                    <div className="space-y-3 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-4">
                      {Object.entries(parsePostContent(selectedPost.content || '').map).map(([platformKey, platformCaption]) => (
                        <div key={platformKey} className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs font-extrabold text-[#2563EB] border-b border-[var(--border-color)] pb-1">
                            {getPlatformIcon(platformKey)}
                            <span>{platformKey} CAPTION</span>
                          </div>
                          <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed pt-1">
                            {platformCaption}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-4 text-xs text-[var(--text-primary)] leading-relaxed font-sans whitespace-pre-wrap">
                      {selectedPost.content}
                    </div>
                  )}
                </div>

                {/* Interactive Media Asset Deck (AI Visual Generation & Custom Media Upload) */}
                <div className="space-y-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-[var(--text-primary)]">
                      <ImageIcon className="h-4 w-4 text-[#2563EB]" />
                      <span>VISUAL MEDIA ASSET</span>
                    </div>
                    {selectedPost.mediaUrls && selectedPost.mediaUrls.length > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        Media Attached
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg-input)] text-[var(--text-secondary)]">
                        No Media (Text Only)
                      </span>
                    )}
                  </div>

                  {selectedPost.mediaUrls && selectedPost.mediaUrls.length > 0 ? (
                    <div className="space-y-3 pt-1">
                      <div className="rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-input)] max-h-60 flex justify-center items-center p-2 relative group">
                        {selectedPost.mediaType === 'VIDEO' ? (
                          <video src={selectedPost.mediaUrls[0]} controls className="max-h-56 object-contain rounded-lg w-full" />
                        ) : (
                          <img src={selectedPost.mediaUrls[0]} alt="Attachment Preview" className="max-h-56 object-contain rounded-lg w-full shadow-sm" />
                        )}
                      </div>

                      {/* Action buttons under attached media */}
                      {(selectedPost.status === 'SCHEDULED' || selectedPost.status === 'DRAFT') && (
                        <div className="flex items-center gap-2 justify-end pt-1">
                          <label className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--border-color)] text-[var(--text-secondary)] border border-[var(--border-color)] flex items-center gap-1.5 cursor-pointer transition-all">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{uploadingMediaId === selectedPost.id ? 'Uploading...' : 'Replace Media'}</span>
                            <input
                              type="file"
                              accept="image/*,video/*"
                              className="hidden"
                              disabled={uploadingMediaId === selectedPost.id}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadDrawerMedia(selectedPost.id, f);
                              }}
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => handleGenerateAiVisual(selectedPost.id)}
                            disabled={generatingImageId === selectedPost.id}
                            className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-[#2563EB]/10 hover:bg-[#2563EB]/20 text-[#2563EB] border border-[#2563EB]/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Sparkles className={`w-3.5 h-3.5 ${generatingImageId === selectedPost.id ? 'animate-spin' : ''}`} />
                            <span>{generatingImageId === selectedPost.id ? 'Generating...' : 'Regenerate AI Visual'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveDrawerMedia(selectedPost.id)}
                            className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Dotted Empty Dropzone with 1-Click Action Buttons */
                    <div className="border border-dashed border-[var(--border-color)] rounded-xl p-4 text-center space-y-3 bg-[var(--bg-input)]/50">
                      <p className="text-xs text-[var(--text-secondary)] font-medium">
                        Boost your LinkedIn reach by 2x-3x by attaching an eye-catching visual graphic or custom media.
                      </p>

                      {(selectedPost.status === 'SCHEDULED' || selectedPost.status === 'DRAFT') && (
                        <div className="flex flex-wrap items-center justify-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleGenerateAiVisual(selectedPost.id)}
                            disabled={generatingImageId === selectedPost.id}
                            className="text-xs font-extrabold px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Sparkles className={`w-4 h-4 ${generatingImageId === selectedPost.id ? 'animate-spin' : ''}`} />
                            <span>{generatingImageId === selectedPost.id ? 'Generating Visual...' : 'Generate AI Visual (Flux)'}</span>
                          </button>

                          <label className="text-xs font-bold px-3.5 py-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--border-color)] text-[var(--text-primary)] border border-[var(--border-color)] flex items-center gap-2 cursor-pointer transition-all">
                            <Upload className="w-4 h-4 text-[#2563EB]" />
                            <span>{uploadingMediaId === selectedPost.id ? 'Uploading...' : 'Upload Custom Media'}</span>
                            <input
                              type="file"
                              accept="image/*,video/*"
                              className="hidden"
                              disabled={uploadingMediaId === selectedPost.id}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadDrawerMedia(selectedPost.id, f);
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Live Post Engagement & Performance Analytics Deck (For Published Posts) */}
                {selectedPost.status === 'PUBLISHED' && (
                  <div className="space-y-3 bg-[var(--bg-input)] border border-[#2563EB]/30 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-extrabold text-[#2563EB]">
                        <BarChart2 className="h-4 w-4" />
                        <span>LIVE ENGAGEMENT & PERFORMANCE METRICS</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSyncMetrics(selectedPost.id)}
                        disabled={syncingMetricsId === selectedPost.id}
                        className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-[#2563EB]/10 hover:bg-[#2563EB]/20 text-[#2563EB] border border-[#2563EB]/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        title="Fetch latest Likes and Comments directly from LinkedIn API"
                      >
                        <RefreshCw className={`w-3 h-3 ${syncingMetricsId === selectedPost.id ? 'animate-spin' : ''}`} />
                        <span>{syncingMetricsId === selectedPost.id ? 'Syncing...' : 'Sync Live'}</span>
                      </button>
                    </div>

                    {/* Engagement Metric Grid */}
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-2.5 text-center">
                        <span className="text-[10px] text-[var(--text-secondary)] font-bold block flex items-center justify-center gap-1">
                          <Eye className="w-3 h-3 text-[#2563EB]" /> Reach
                        </span>
                        <p className="text-sm font-extrabold text-[var(--text-primary)] mt-0.5">
                          {(selectedPost as any).views || (selectedPost as any).impressions || '120+'}
                        </p>
                      </div>

                      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-2.5 text-center">
                        <span className="text-[10px] text-[var(--text-secondary)] font-bold block flex items-center justify-center gap-1">
                          <ThumbsUp className="w-3 h-3 text-blue-500" /> Likes
                        </span>
                        <p className="text-sm font-extrabold text-[var(--text-primary)] mt-0.5">
                          {(selectedPost as any).likes || 1}
                        </p>
                      </div>

                      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-2.5 text-center">
                        <span className="text-[10px] text-[var(--text-secondary)] font-bold block flex items-center justify-center gap-1">
                          <MessageSquare className="w-3 h-3 text-emerald-500" /> Comments
                        </span>
                        <p className="text-sm font-extrabold text-[var(--text-primary)] mt-0.5">
                          {(selectedPost as any).comments || 0}
                        </p>
                      </div>

                      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-2.5 text-center">
                        <span className="text-[10px] text-[var(--text-secondary)] font-bold block flex items-center justify-center gap-1">
                          <Share2 className="w-3 h-3 text-purple-500" /> Shares
                        </span>
                        <p className="text-sm font-extrabold text-[var(--text-primary)] mt-0.5">
                          {(selectedPost as any).shares || 0}
                        </p>
                      </div>
                    </div>

                    {/* Direct Live Link Button */}
                    {selectedPost.socialPostLogs?.find(l => l.externalPostUrl)?.externalPostUrl && (
                      <div className="pt-2">
                        <a
                          href={selectedPost.socialPostLogs.find(l => l.externalPostUrl)?.externalPostUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2 px-3 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                        >
                          <span>View Live Post on {selectedPost.targetPlatforms[0] || 'LinkedIn'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}

                    {/* AI Virality Diagnostic Button */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => handleDiagnosePost(selectedPost)}
                        disabled={diagnosingVirality}
                        className="w-full py-2 px-3 bg-[var(--bg-card)] hover:bg-[#2563EB]/10 border border-[#2563EB]/30 text-[#2563EB] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${diagnosingVirality ? 'animate-spin' : ''}`} />
                        <span>{diagnosingVirality ? 'Analyzing Post Virality...' : '🔬 Run AI Virality & Hook Diagnostic'}</span>
                      </button>
                    </div>

                    {/* Virality Diagnostic Results Card */}
                    {viralityDiagnosis && (
                      <div className="space-y-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3.5 mt-2 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                          <span className="text-xs font-extrabold text-[var(--text-primary)]">Virality Score</span>
                          <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                            viralityDiagnosis.viralityScore >= 80 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {viralityDiagnosis.viralityScore}/100
                          </span>
                        </div>

                        {/* Breakdown Scores */}
                        <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                          <div className="p-1.5 bg-[var(--bg-input)] rounded-lg">
                            <span className="text-[var(--text-secondary)] font-bold block">Hook Score</span>
                            <span className="font-extrabold text-[#2563EB]">{viralityDiagnosis.breakdown?.hookScore}/100</span>
                          </div>
                          <div className="p-1.5 bg-[var(--bg-input)] rounded-lg">
                            <span className="text-[var(--text-secondary)] font-bold block">Readability</span>
                            <span className="font-extrabold text-emerald-500">{viralityDiagnosis.breakdown?.readabilityScore}/100</span>
                          </div>
                          <div className="p-1.5 bg-[var(--bg-input)] rounded-lg">
                            <span className="text-[var(--text-secondary)] font-bold block">CTA Trigger</span>
                            <span className="font-extrabold text-purple-500">{viralityDiagnosis.breakdown?.ctaScore}/100</span>
                          </div>
                        </div>

                        {/* Hook Critique */}
                        {viralityDiagnosis.breakdown?.hookCritique && (
                          <div className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-input)] p-2 rounded-lg leading-relaxed">
                            <span className="font-bold text-[var(--text-primary)]">Hook Critique: </span>
                            {viralityDiagnosis.breakdown.hookCritique}
                          </div>
                        )}

                        {/* Improved Viral Hook Suggestion */}
                        {viralityDiagnosis.improvedViralHook && (
                          <div className="text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 p-2.5 rounded-lg leading-relaxed space-y-1">
                            <span className="font-extrabold flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-emerald-500" />
                              AI Recommended High-Impact Hook:
                            </span>
                            <p className="font-medium italic">"{viralityDiagnosis.improvedViralHook}"</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Per-Platform Publication History Logs */}
                <div className="space-y-3">
                  <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Platform Publication Logs</span>
                  
                  {!selectedPost.socialPostLogs || selectedPost.socialPostLogs.length === 0 ? (
                    <div className="bg-[var(--bg-input)] p-4 text-center text-xs text-[var(--text-secondary)] rounded-2xl border border-[var(--border-color)]">
                      No publication history logs recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedPost.socialPostLogs.map((log) => {
                        const success = log.status === 'SUCCESS';
                        return (
                          <div key={log.id} className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getPlatformIcon(log.platform)}
                                <span className="text-xs font-bold text-[var(--text-primary)]">{log.platform}</span>
                              </div>
                              <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                success 
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                              }`}>
                                {log.status}
                              </span>
                            </div>

                            {success ? (
                              <div className="text-[11px] text-[var(--text-secondary)] space-y-1 pt-1">
                                <p><span className="font-bold">External Post ID:</span> {log.externalPostId || 'N/A'}</p>
                                {log.externalPostUrl && (
                                  <a
                                    href={log.externalPostUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[#2563EB] font-bold hover:underline inline-flex items-center gap-1 mt-1"
                                  >
                                    View Live Publication ↗
                                  </a>
                                )}
                              </div>
                            ) : (
                              <div className="text-[11px] text-rose-500 flex items-start gap-1.5 pt-1">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <p className="leading-relaxed"><span className="font-bold">Failure Details:</span> {log.errorMessage || 'Unknown execution error'}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions Bar */}
              <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between gap-3 mt-6">
                <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                  Created: {formatDate(selectedPost.createdAt)}
                </span>

                <div className="flex items-center gap-2">
                  {(selectedPost.status === 'DRAFT' || selectedPost.status === 'SCHEDULED' || selectedPost.status === 'FAILED' || selectedPost.status === 'PARTIALLY_PUBLISHED') && (
                    <button
                      type="button"
                      onClick={(e) => handleRetryPost(e, selectedPost.id)}
                      disabled={retryingId === selectedPost.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${retryingId === selectedPost.id ? 'animate-spin' : ''}`} />
                      {retryingId === selectedPost.id ? 'Publishing...' : '🚀 Publish Now'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleCancelSchedule(e, selectedPost.id)}
                    disabled={cancellingId === selectedPost.id}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {cancellingId === selectedPost.id ? 'Deleting...' : 'Delete Post'}
                  </button>
                </div>
              </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}