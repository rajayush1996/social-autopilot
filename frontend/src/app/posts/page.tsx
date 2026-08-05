'use client';

import React, { useEffect, useState } from 'react';
import { 
  Calendar, 
  Trash2, 
  Clock, 
  Info,
  CalendarDays,
  XCircle,
  AlertCircle,
  RefreshCw,
  Edit3
} from 'lucide-react';
import ApiService from '@/services/apiService';
import CONFIG from '@/config';
import { Post } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { formatDateTime, formatDate } from '@/utils/date';
import CarouselSlideDeck from '@/components/CarouselSlideDeck';

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

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'ALL' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED'>('ALL');
  
  // Modal / Drawer state
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const toast = useToast();

  // Inline Post Editor state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [savingPostId, setSavingPostId] = useState<string | null>(null);

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

import socketClient from '@/utils/socket';

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
    if (filterTab === 'ALL') return true;
    return post.status === filterTab;
  });

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Querying queue records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
          Queue & Post History
        </h1>
        <p className="text-slate-400 mt-1">
          Review, inspect, or cancel delayed background post tasks and execution logs.
        </p>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-800/80 gap-6">
        {(['ALL', 'SCHEDULED', 'PUBLISHED', 'FAILED'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`pb-3 text-xs font-bold uppercase tracking-wider relative transition-all duration-300 ${
              filterTab === tab ? 'text-indigo-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
            {filterTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
            )}
          </button>
        ))}
      </div>

      {/* Grid of posts */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-850 rounded-3xl">
          <CalendarDays className="h-12 w-12 text-slate-650 mx-auto mb-2" />
          <p className="text-slate-400 font-semibold">No posts found</p>
          <span className="text-xs text-slate-500">There are no records in the queue matching this tab category.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPosts.map(post => (
            <div
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="bg-slate-900/40 border border-slate-850 hover:border-slate-750 rounded-3xl p-5 cursor-pointer flex flex-col justify-between shadow-xl transition-all duration-300 hover:-translate-y-0.5"
            >
              <div>
                {/* Post Card Header */}
                <div className="flex items-center justify-between mb-3.5">
                  {/* Status Badge */}
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
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

                  {/* Platforms list */}
                  <div className="flex items-center gap-1.5">
                    {post.targetPlatforms.map(plt => (
                      <div key={plt} className="p-1 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center">
                        {getPlatformIcon(plt)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Content snippet & media thumbnail / Inline Editor */}
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    {editingPostId === post.id ? (
                      <div className="space-y-2 bg-slate-955 p-3 rounded-2xl border border-indigo-500/50" onClick={(e) => e.stopPropagation()}>
                        <textarea
                          rows={4}
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 resize-none font-sans leading-relaxed"
                          placeholder="Edit post content..."
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEditingPostId(null); }}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleSavePostEdit(e, post.id)}
                            disabled={savingPostId === post.id}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                          >
                            {savingPostId === post.id ? 'Saving...' : 'Save Content'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">{post.content}</p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-500" />
                            {post.scheduledAt ? `${formatDateTime(post.scheduledAt)} UTC` : 'Published Immediate'}
                          </span>
                          
                          {(post.status === 'SCHEDULED' || post.status === 'DRAFT') && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPostId(post.id);
                                setEditingContent(post.content);
                              }}
                              className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-1 rounded-lg transition-all active:scale-95 cursor-pointer shadow-sm"
                              title="Edit pending post content"
                            >
                              <Edit3 className="h-3 w-3" /> Edit Post Content
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {post.mediaUrls.length > 0 && (
                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-800 bg-slate-955 shrink-0">
                      {post.mediaType === 'VIDEO' ? (
                        <video src={post.mediaUrls[0]} muted className="w-full h-full object-cover" />
                      ) : (
                        <img src={post.mediaUrls[0]} alt="Media attachment thumbnail" className="w-full h-full object-cover" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick action button for failed posts */}
              {(post.status === 'FAILED' || post.status === 'PARTIALLY_PUBLISHED') && (
                <div className="mt-4 pt-3.5 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[9px] text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Publishing Failed
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleRetryPost(e, post.id)}
                    disabled={retryingId === post.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-[10px] font-extrabold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${retryingId === post.id ? 'animate-spin' : ''}`} />
                    {retryingId === post.id ? 'Re-queuing...' : 'Retry / Republish'}
                  </button>
                </div>
              )}

              {/* Quick action button for scheduled posts */}
              {(post.status === 'SCHEDULED' || post.status === 'DRAFT') && (
                <div className="mt-4 pt-3.5 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">Scheduled Post</span>
                  <button
                    onClick={(e) => handleCancelSchedule(e, post.id)}
                    disabled={cancellingId === post.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-950 hover:bg-rose-950/20 border border-slate-800 hover:border-rose-900/30 text-slate-400 hover:text-rose-400 rounded-lg text-[10px] font-bold transition-all duration-300 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    {cancellingId === post.id ? 'Cancelling...' : 'Cancel Queue'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Details drawer/modal side panel */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="bg-slate-900 h-full w-full max-w-lg border-l border-slate-800 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-350">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-lg text-slate-100">Post Details & Logs</h3>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">ID: {selectedPost.id}</span>
                </div>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="p-1.5 hover:bg-slate-850 rounded-lg border border-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Body Content */}
              <div className="py-6 space-y-6 overflow-y-auto max-h-[70vh]">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Post Content</span>
                  {selectedPost.content && /(?:SLIDE|Slide)\s*\d+/i.test(selectedPost.content) ? (
                    <CarouselSlideDeck
                      text={selectedPost.content}
                      platformLabel={selectedPost.targetPlatforms[0] || 'Social Post'}
                    />
                  ) : (
                    <div className="bg-slate-955 border border-slate-855 rounded-2xl p-4 text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                      {selectedPost.content}
                    </div>
                  )}
                </div>

                {selectedPost.status === 'SCHEDULED' && (
                  <div className="bg-slate-955 border border-indigo-500/30 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-indigo-400" /> Reschedule Release Time
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">Moves this post to a new slot</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="datetime-local"
                        defaultValue={selectedPost.scheduledAt ? new Date(selectedPost.scheduledAt).toISOString().slice(0, 16) : ''}
                        onChange={async (e) => {
                          const newDateStr = e.target.value;
                          if (!newDateStr) return;
                          try {
                            const isoDate = new Date(newDateStr).toISOString();
                            await ApiService.updatePost(selectedPost.id, { scheduledAt: isoDate });
                            setSelectedPost({ ...selectedPost, scheduledAt: isoDate });
                            setPosts((prev) => prev.map((p) => p.id === selectedPost.id ? { ...p, scheduledAt: isoDate } : p));
                            toast.success('Post rescheduled to new target date & time!');
                          } catch (err) {
                            toast.error('Failed to reschedule post.');
                          }
                        }}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {selectedPost.mediaUrls.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Attached File</span>
                    <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 max-h-48 flex justify-center items-center">
                      {selectedPost.mediaType === 'VIDEO' ? (
                        <video src={selectedPost.mediaUrls[0]} controls className="max-h-48 object-cover" />
                      ) : (
                        <img src={selectedPost.mediaUrls[0]} alt="Attachment Preview" className="max-h-48 object-cover" />
                      )}
                    </div>
                  </div>
                )}

                {/* Per platform Logs list */}
                <div className="space-y-3">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Platform Publication Logs</span>
                  
                  {selectedPost.socialPostLogs && selectedPost.socialPostLogs.length === 0 ? (
                    <div className="bg-slate-950 p-4 text-center text-xs text-slate-500 rounded-2xl border border-slate-855">
                      No publication history logs generated yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedPost.socialPostLogs?.map((log) => {
                        const success = log.status === 'SUCCESS';
                        return (
                          <div key={log.id} className="bg-slate-950/80 border border-slate-855 rounded-2xl p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getPlatformIcon(log.platform)}
                                <span className="text-xs font-bold text-slate-200">{log.platform}</span>
                              </div>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                success 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}>
                                {log.status}
                              </span>
                            </div>

                            {success ? (
                              <div className="text-[10px] text-slate-400 space-y-1">
                                <p><strong>External ID:</strong> {log.externalPostId || 'N/A'}</p>
                                {log.externalPostUrl && (
                                  <a
                                    href={log.externalPostUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-indigo-400 font-semibold hover:underline block mt-1"
                                  >
                                    View Live Publication ↗
                                  </a>
                                )}
                              </div>
                            ) : (
                              <div className="text-[10px] text-rose-400 flex items-start gap-1">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <p className="leading-relaxed"><strong>Error message:</strong> {log.errorMessage || 'Unknown error'}</p>
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

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Created: {formatDate(selectedPost.createdAt)} UTC</span>

              {(selectedPost.status === 'FAILED' || selectedPost.status === 'PARTIALLY_PUBLISHED') && (
                <button
                  type="button"
                  onClick={(e) => handleRetryPost(e, selectedPost.id)}
                  disabled={retryingId === selectedPost.id}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${retryingId === selectedPost.id ? 'animate-spin' : ''}`} />
                  {retryingId === selectedPost.id ? 'Re-queuing Post...' : 'Retry / Republish Now'}
                </button>
              )}

              {selectedPost.status === 'SCHEDULED' && (
                <button
                  onClick={(e) => handleCancelSchedule(e, selectedPost.id)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all duration-300"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Cancel Schedule
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
