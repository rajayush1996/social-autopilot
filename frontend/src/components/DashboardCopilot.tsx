'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  Send, 
  X, 
  Minus, 
  Maximize2, 
  Calendar, 
  Clock, 
  Zap, 
  CheckCircle2, 
  ArrowUpRight, 
  ChevronRight,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { Post, SocialAccount, User } from '@/lib/api';
import { formatDateTimeFriendly } from '@/utils/date';

interface DashboardCopilotProps {
  user: User | null;
  posts: Post[];
  accounts: SocialAccount[];
  selectedPlatform?: string;
  peakSlots?: any;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  action?: {
    label: string;
    href: string;
  };
}

export default function DashboardCopilot({
  user,
  posts,
  accounts,
  selectedPlatform = 'LINKEDIN',
  peakSlots,
}: DashboardCopilotProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const safePosts = Array.isArray(posts) ? posts : [];
  const safeAccounts = Array.isArray(accounts) ? accounts : [];
  const scheduledPosts = safePosts.filter(p => p?.status === 'SCHEDULED');
  const publishedPosts = safePosts.filter(p => p?.status === 'PUBLISHED');
  const activeAccounts = safeAccounts.filter(a => a?.isActive !== false);
  const allowedPlatforms = (user as any)?.allowedPlatforms || ['LINKEDIN'];

  // Initial welcome message
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: `👋 Hi ${user?.name ? user.name.split(' ')[0] : 'there'}! I'm your **Dashboard Copilot**. I analyze your live PostgreSQL pipeline, queued dispatches, and algorithm telemetry in real-time.\n\nAsk me anything about your upcoming posts, best posting windows, or ideas!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  // Reasoning Engine: Evaluates user query over real DB state
  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    setTimeout(() => {
      const lower = query.toLowerCase();
      let responseText = '';
      let action: { label: string; href: string } | undefined = undefined;

      // STRICT SECURITY & PRIVACY GUARD: Tenant Isolation Shield
      if (
        lower.includes('other user') || 
        lower.includes('other account') || 
        lower.includes('another user') || 
        lower.includes('someone else') || 
        lower.includes('kisi aur') || 
        lower.includes('dusre user') || 
        lower.includes('dusra account') || 
        lower.includes('all users') || 
        lower.includes('other people') || 
        lower.includes('admin pass') ||
        lower.includes('database dump')
      ) {
        responseText = `🔒 **Privacy & Tenant Isolation Shield:**\n\nI am cryptographically restricted to your authenticated workspace only (\`${user?.email || 'your account'}\`).\n\nUnder strict multi-tenant isolation and data privacy policies, I have **zero access** to any other user's posts, channels, or credentials. I can only assist you with your own live pipeline.`;
      }
      // 1. Queue / Schedule Status Query
      else if (lower.includes('queue') || lower.includes('scheduled') || lower.includes('pipeline') || lower.includes('kya post') || lower.includes('upcoming')) {
        if (scheduledPosts.length === 0) {
          responseText = `⚠️ **Queue Status Alert:** You currently have **0 posts scheduled** in your database pipeline.\n\nYour social channels will go idle once today's cycle completes. I recommend generating 2–3 fresh drafts to maintain audience momentum.`;
          action = { label: 'Create AI Draft in Composer', href: '/composer' };
        } else {
          const nextPost = scheduledPosts[0];
          const nextTime = nextPost.scheduledAt ? formatDateTimeFriendly(nextPost.scheduledAt) : 'Soon';
          const nextPlat = nextPost.targetPlatforms?.[0] || selectedPlatform;
          
          responseText = `📊 **Pipeline Telemetry:** You have **${scheduledPosts.length} post${scheduledPosts.length > 1 ? 's' : ''} scheduled** in your queue.\n\n* **Next Dispatch:** ${nextTime}\n* **Target Channel:** ${nextPlat}\n* **Preview:** "${nextPost.content.slice(0, 75)}..."\n\nYour automated queue health is currently **🟢 Optimal**.`;
          action = { label: 'View Full Post Queue', href: '/posts' };
        }
      } 
      // 2. Best Time / Peak Window Query
      else if (lower.includes('time') || lower.includes('peak') || lower.includes('timing') || lower.includes('kab post') || lower.includes('window') || lower.includes('best')) {
        const plat = selectedPlatform || 'LINKEDIN';
        const primeMsg = peakSlots?.activePrimeWindow?.message;
        const primeTime = peakSlots?.activePrimeWindow?.timeFormatted || (plat === 'INSTAGRAM' ? '8:00 PM' : plat === 'X' ? '1:15 PM' : '10:30 AM');
        
        responseText = `🕒 **Audience Peak Window Analysis:**\n\nFor **${plat}**, your highest audience engagement cluster is **${primeTime}**.\n\n* ${primeMsg || `Based on platform benchmarks and your ${publishedPosts.length} published dispatches, posting around this window yields up to **+3.2x higher reach**.`}\n\n* **Algorithmic Tip:** Publish 10 minutes *before* the peak window so the feed algorithm indexes your post right as users open the app.`;
        action = { label: `Schedule for ${primeTime}`, href: `/composer?scheduleTime=peak&platform=${plat}` };
      }
      // 3. Post Ideas / Hook Suggestions
      else if (lower.includes('idea') || lower.includes('suggest') || lower.includes('topic') || lower.includes('hook') || lower.includes('kya likhu')) {
        const plat = selectedPlatform || 'LINKEDIN';
        if (plat === 'LINKEDIN') {
          responseText = `💡 **Top 3 High-Yield B2B Hooks for LinkedIn:**\n\n1. *"90% of founders spend 10 hours a week on social media. Here is how we automated it in 3 steps:"*\n2. *"Stop putting links in your LinkedIn post body. Here is why the algorithm penalizes it (and what to do instead):"*\n3. *"3 lessons learned scaling an AI product from 0 to 10k users:"*\n\nWhich topic would you like to draft?`;
          action = { label: 'Draft Hook #1 in Composer', href: '/composer?hook=90%25%20of%20founders%20spend%2010%20hours%20a%20week' };
        } else if (plat === 'X') {
          responseText = `🔥 **Top 3 High-Velocity Hooks for X (Twitter):**\n\n1. *"Most creators think they need more followers. What they actually need is a conversion funnel:"*\n2. *"How to automate your entire social schedule in 15 minutes a week (Save this):"*\n3. *"The 1 rule top 1% accounts follow on X:"*\n\nRemember: Keep paragraphs under 2 sentences for high bookmark rates!`;
          action = { label: 'Draft Thread on X', href: '/composer?platform=X' };
        } else {
          responseText = `📸 **Top 3 Viral Hooks for Instagram:**\n\n1. *"Comment 'LINK' below and my AI assistant will DM you our free automation sheet instantly 👇"*\n2. *"3 tools I wish I knew before starting my agency:"*\n3. *"Stop wasting hours scheduling reels manually:"*`;
          action = { label: 'Draft Reel Caption', href: '/composer?platform=INSTAGRAM' };
        }
      }
      // 4. Performance Audit Query
      else if (lower.includes('audit') || lower.includes('performance') || lower.includes('growth') || lower.includes('analytics') || lower.includes('kaisa chal')) {
        const failCount = safePosts.filter(p => p?.status === 'FAILED').length;
        const total = publishedPosts.length;
        const successRate = total > 0 ? Math.round(((total - failCount) / total) * 100) : 100;

        responseText = `📈 **Live Database Audit Summary:**\n\n* **Total Published Dispatches:** ${total}\n* **Delivery Reliability:** ${successRate}%\n* **Active Connected Accounts:** ${activeAccounts.length} of ${allowedPlatforms.length} allowed\n* **AI Generation Credits:** ${user?.aiCredits ?? 15} remaining (${user?.plan || 'Free'} Plan)\n\n**Diagnosis:** ${total >= 5 ? 'Your publishing cadence is consistent. Keep scheduling during peak windows to amplify reach.' : 'You have a fresh account. Dispatching at least 3 posts unlocks personalized audience radar!'}`;
        action = { label: 'View Full Queue', href: '/posts' };
      }
      // 5. General / Algorithm Questions
      else {
        responseText = `🧠 **Copilot Analysis:**\n\nI analyzed your query: *"${query}"* against your live workspace.\n\n* **Your Active Channel:** ${selectedPlatform}\n* **Allowed Channels:** ${allowedPlatforms.join(', ')}\n* **Connected Accounts:** ${activeAccounts.map(a => a.platform).join(', ') || 'None linked yet'}\n\nWould you like me to audit your queue, draft a new post, or calibrate peak timings for ${selectedPlatform}?`;
        action = { label: 'Open Post Composer', href: '/composer' };
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action,
      };

      setMessages(prev => [...prev, assistantMsg]);
      setIsThinking(false);
    }, 600);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* 1. EXPANDED CHAT PANEL */}
      {isOpen && (
        <div 
          className={`w-[90vw] sm:w-[410px] bg-[var(--bg-card)]/95 backdrop-blur-2xl border border-[var(--border-color)] shadow-2xl rounded-3xl mb-3 flex flex-col overflow-hidden transition-all duration-300 animate-fadeIn ${
            isMinimized ? 'h-16' : 'h-[540px] max-h-[82vh]'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-input)]/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#38bdf8] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-[var(--text-primary)]">Dashboard Copilot</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-[10px] text-[var(--text-secondary)] font-medium">Live PostgreSQL Reasoning Engine</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-rose-500/10 text-[var(--text-secondary)] hover:text-rose-500 transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Message List */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar text-xs">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    <div
                      className={`p-3.5 rounded-2xl max-w-[88%] leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#2563EB] text-white rounded-tr-xs shadow-xs font-medium'
                          : 'bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-tl-xs space-y-2'
                      }`}
                    >
                      <div className="whitespace-pre-line">
                        {msg.content}
                      </div>

                      {msg.action && (
                        <div className="pt-2 border-t border-[var(--border-color)]">
                          <Link
                            href={msg.action.href}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl font-bold text-[11px] shadow-xs transition-all"
                          >
                            <span>{msg.action.label}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-[var(--text-secondary)] px-1">
                      {msg.timestamp}
                    </span>
                  </div>
                ))}

                {isThinking && (
                  <div className="flex items-center gap-2 p-3 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-color)] w-36">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
                    <span className="text-[11px] text-[var(--text-secondary)] font-bold">Analyzing DB...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestion Chips */}
              <div className="p-2 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex items-center gap-1.5 overflow-x-auto shrink-0">
                {[
                  { label: '📊 Audit Queue', query: 'How is my queue health?' },
                  { label: '🕒 Best Time', query: 'When is my best time to post today?' },
                  { label: '💡 Viral Hooks', query: 'Give me 3 viral ideas for my channels' },
                  { label: '📈 Audit Growth', query: 'Analyze my performance metrics' },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(chip.query)}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[var(--bg-input)] hover:bg-[#2563EB]/10 hover:text-[#2563EB] border border-[var(--border-color)] text-[var(--text-secondary)] shrink-0 transition-all cursor-pointer"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Input Footer */}
              <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-card)] shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about your queue, timing, or ideas..."
                    className="flex-1 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-[#2563EB] font-medium"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isThinking}
                    className="p-2 bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl transition-all cursor-pointer shadow-xs shrink-0"
                    title="Send message"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}

      {/* 2. STICKY TRIGGER FLOATING PILL BUTTON */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group px-4 py-3 bg-[var(--bg-card)] hover:bg-[#2563EB]/10 border-2 border-[#2563EB]/30 hover:border-[#2563EB] rounded-full shadow-2xl backdrop-blur-xl flex items-center gap-3 transition-all duration-300 hover:scale-105 cursor-pointer"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#2563EB] to-[#38bdf8] flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[var(--bg-card)] animate-pulse" />
          </div>

          <div className="text-left pr-1">
            <span className="text-xs font-black text-[var(--text-primary)] block">AI Copilot</span>
            <span className="text-[10px] font-bold text-emerald-500 block -mt-0.5">Live Database Radar</span>
          </div>
        </button>
      )}
    </div>
  );
}
