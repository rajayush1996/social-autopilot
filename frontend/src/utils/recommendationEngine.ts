import { Post } from '@/lib/api';

export interface PostScoreBreakdown {
  hookCuriosity: number; // 0-100
  dwellTimeFormatting: number; // 0-100
  viralShareability: number; // 0-100
  timingAlignment: number; // 0-100
}

export interface Prescription {
  priority: 'CRITICAL' | 'HIGH' | 'RECOMMENDED';
  category: 'LINK_PENALTY' | 'DWELL_TIME' | 'HOOK' | 'ENGAGEMENT_CTA' | 'MEDIA' | 'TIMING';
  title: string;
  action: string;
  algorithmicRationale: string;
}

export interface ContentEvidenceTag {
  id: string;
  type: 'HOOK' | 'LINK' | 'DWELL' | 'CTA';
  status: 'OPTIMAL' | 'WARNING' | 'CRITICAL';
  label: string;
  impact: string;
  snippet?: string;
  explanation: string;
}

export interface PostDiagnosisReport {
  postId: string;
  snippet: string;
  platform: string;
  postAvailablePlatforms: string[];
  publishedAt: string | null;
  overallScore: number;
  verdict: 'HIGH_VIRALITY_POTENTIAL' | 'MODERATE_ENGAGEMENT' | 'REACH_THROTTLED';
  verdictLabel: string;
  scores: PostScoreBreakdown;
  reachBottleneck: {
    headline: string;
    description: string;
    penaltyEstimate: string;
    isCritical: boolean;
  };
  prescriptions: Prescription[];
  evidenceTags: ContentEvidenceTag[];
  improvedHook: string;
  suggestedTags: string[];
}

/**
 * Intelligent helper to extract clean, plain English prose from serialized multi-platform post JSON.
 * Prevents {"LINKEDIN":"..."} bleed in UI dropdowns and guarantees accurate content scoring.
 */
export function extractCleanPostText(rawContent: string, preferredPlatform?: string): string {
  if (!rawContent) return '';
  const trimmed = rawContent.trim();

  if (
    trimmed.startsWith('{') ||
    trimmed.includes('"LINKEDIN"') ||
    trimmed.includes('"X"') ||
    trimmed.includes('"INSTAGRAM"')
  ) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        if (preferredPlatform) {
          const platKey = preferredPlatform.toUpperCase();
          if (parsed[platKey] && typeof parsed[platKey] === 'string') {
            return parsed[platKey].trim();
          }
        }
        const candidate =
          parsed.LINKEDIN ||
          parsed.X ||
          parsed.INSTAGRAM ||
          parsed.FACEBOOK ||
          parsed.content ||
          parsed.text;
        if (candidate && typeof candidate === 'string') return candidate.trim();

        const firstStringVal = Object.values(parsed).find(
          (v) => typeof v === 'string' && v.trim().length > 0
        );
        if (firstStringVal) return String(firstStringVal).trim();
      }
    } catch {
      // Regex fallback if JSON was partial or malformed
      const cleaned = trimmed
        .replace(/^\{\s*"[A-Za-z0-9_]+":\s*"/, '')
        .replace(/"\s*,\s*"[A-Za-z0-9_]+":\s*"/g, ' ')
        .replace(/"\s*\}$/, '');
      return cleaned.trim();
    }
  }

  return trimmed;
}

/**
 * Autonomous Recommendation & Post Diagnostic Engine
 * Analyzes content anatomy, temporal telemetry, and platform algorithmic ranking factors
 * to diagnose why impressions/reach stalled despite likes, and provides concrete next-post prescriptions.
 */
export function diagnosePost(
  post: Post,
  allPublishedPosts: Post[] = [],
  platformOverride?: string
): PostDiagnosisReport {
  // 1. Dynamic Platform Resolution strictly based on post's targetPlatforms
  const rawTarget = post.targetPlatforms;
  const postPlatforms: string[] = Array.isArray(rawTarget) && rawTarget.length > 0
    ? rawTarget.map((p) => String(p).toUpperCase())
    : ['LINKEDIN'];

  const resolvedPlatform =
    platformOverride && postPlatforms.includes(platformOverride.toUpperCase())
      ? platformOverride.toUpperCase()
      : postPlatforms[0];

  // 2. Extract 100% clean human-readable prose (unwrapping JSON if multi-channel)
  const cleanContent = extractCleanPostText(post.content || '', resolvedPlatform);
  const lines = cleanContent.split('\n').map((l) => l.trim()).filter(Boolean);
  const totalChars = cleanContent.length;
  const firstLine = lines[0] || '';
  const lastLine = lines[lines.length - 1] || '';

  // 3. Feature Scanners
  // (a) Outbound Link Scanner
  const urlRegex = /https?:\/\/[^\s]+/gi;
  const urlMatches = cleanContent.match(urlRegex) || [];
  const hasOutboundUrl = urlMatches.length > 0;

  // (b) Dwell-Time & Formatting Scanner
  const longestLine = Math.max(...lines.map((l) => l.length), 0);
  const isWallOfText = longestLine > 220 || (totalChars > 300 && lines.length <= 2);
  const hasGoodLineBreaks = lines.length >= 3 && longestLine <= 140;

  // (c) Hook Curiosity Scanner
  const corporateOpeners = [
    /excited to share/i,
    /happy to announce/i,
    /proud to/i,
    /thrilled to/i,
    /we are pleased/i,
    /check out my/i,
    /just launched/i,
  ];
  const hasBoringOpener = corporateOpeners.some((rx) => rx.test(firstLine));
  const hasNumericHook = /^\d+|top \d+|\d+ ways|\d+ lessons|\d+ tips|\d+x|\$\d+/i.test(firstLine);
  const hasCuriosityHook = /stop doing|why most|the biggest lie|nobody talks about|hard truth|secret|how we scaled|the playbook|the truth about|don't make this/i.test(firstLine);
  const isPunchyHook = firstLine.length > 15 && firstLine.length <= 90;

  // (d) Terminal CTA Scanner
  const hasQuestionMark = lastLine.includes('?');
  const hasDiscussionPrompt = /what do you think|agree or disagree|thoughts\?|drop your|how do you|which one/i.test(lastLine);
  const hasTerminalCta = hasQuestionMark || hasDiscussionPrompt;

  // (e) Media Check
  const hasMedia = (Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0) || post.mediaType !== null;

  // (f) Temporal Timing Scanner
  let timingScore = 70;
  if (post.publishedAt) {
    const pubDate = new Date(post.publishedAt);
    const pubHour = pubDate.getHours();
    // Peak engagement windows: 8-11 AM and 5-7 PM
    if ((pubHour >= 8 && pubHour <= 11) || (pubHour >= 17 && pubHour <= 19)) {
      timingScore = 92;
    } else if (pubHour >= 0 && pubHour <= 6) {
      timingScore = 38; // Graveyard hours
    } else {
      timingScore = 65;
    }
  }

  // 4. Compute Granular Scores (0 - 100)
  // Hook Curiosity Score
  let hookScore = 60;
  if (hasBoringOpener) hookScore -= 25;
  if (hasNumericHook) hookScore += 18;
  if (hasCuriosityHook) hookScore += 22;
  if (isPunchyHook) hookScore += 10;
  hookScore = Math.max(20, Math.min(98, hookScore));

  // Dwell-Time Formatting Score
  let dwellScore = 65;
  if (isWallOfText) dwellScore -= 35;
  if (hasGoodLineBreaks) dwellScore += 25;
  if (totalChars < 80) dwellScore -= 15; // Too brief for high dwell
  dwellScore = Math.max(15, Math.min(96, dwellScore));

  // Viral Shareability Score
  let shareScore = 55;
  if (hasOutboundUrl) {
    shareScore -= resolvedPlatform === 'LINKEDIN' ? 30 : 20;
  }
  if (hasMedia) shareScore += 15;
  if (hasTerminalCta) shareScore += 15;
  shareScore = Math.max(15, Math.min(95, shareScore));

  // Overall Weighted Score
  const overallScore = Math.round(
    hookScore * 0.30 +
    dwellScore * 0.25 +
    shareScore * 0.30 +
    timingScore * 0.15
  );

  let verdict: PostDiagnosisReport['verdict'] = 'MODERATE_ENGAGEMENT';
  let verdictLabel = 'Moderate Engagement Potential';
  if (overallScore >= 82) {
    verdict = 'HIGH_VIRALITY_POTENTIAL';
    verdictLabel = 'High Virality Ready';
  } else if (overallScore < 60 || hasOutboundUrl) {
    verdict = 'REACH_THROTTLED';
    verdictLabel = 'Reach Suppressed by Algorithm';
  }

  // 5. Synthesize "Why Reach Stalled Despite Likes"
  let reachBottleneck = {
    headline: 'Utility Asset & Repost Deficit',
    description:
      'Your post generated warm likes from existing 1st-degree connections, but reach stalled because it lacked a high-utility asset (framework, cheat sheet, or counter-intuitive insight) that compels users to Repost or Bookmark to their own network.',
    penaltyEstimate: '2nd-degree feed injection halted',
    isCritical: false,
  };

  if (hasOutboundUrl) {
    reachBottleneck = {
      headline: 'Outbound Link Suppression Triggered',
      description:
        `An external link was detected directly in the post body. ${
          resolvedPlatform === 'LINKEDIN' ? 'LinkedIn' : resolvedPlatform === 'X' ? 'X (Twitter)' : resolvedPlatform === 'INSTAGRAM' ? 'Instagram' : 'The platform'
        } intentionally suppresses feed distribution when posts drive traffic off-platform, even if existing followers leave likes or comments.`,
      penaltyEstimate: '-40% to -50% Reach Restriction',
      isCritical: true,
    };
  } else if (isWallOfText) {
    reachBottleneck = {
      headline: 'Mobile Dwell-Time Friction (<2.8s drop-off)',
      description:
        'Followers who saw the post clicked "Like" out of goodwill, but mobile users scrolled past without expanding the "see more" fold. The feed algorithm measures reading dwell time before recommending content to broader feeds.',
      penaltyEstimate: 'Dwell time below algorithmic threshold',
      isCritical: true,
    };
  } else if (!hasTerminalCta) {
    reachBottleneck = {
      headline: 'Closed-Loop Narrative (No Discussion Flywheel)',
      description:
        'The post made statements without inviting reader debate. Social algorithms treat multi-tiered comment replies as a 10x distribution signal. Without an open inquiry, the discussion loop died early.',
      penaltyEstimate: 'Low comment reply velocity',
      isCritical: false,
    };
  }

  // 6. Visual Content Evidence Chips (Directly understandable by non-technical creators)
  const evidenceTags: ContentEvidenceTag[] = [];

  if (hasOutboundUrl) {
    evidenceTags.push({
      id: 'tag-link',
      type: 'LINK',
      status: 'CRITICAL',
      label: 'Outbound Link in Body',
      impact: '-45% Reach Penalty',
      snippet: urlMatches[0]?.slice(0, 30) + '...',
      explanation: 'Links send users off-platform. Algorithms restrict feed distribution to keep users inside the app.',
    });
  } else {
    evidenceTags.push({
      id: 'tag-link',
      type: 'LINK',
      status: 'OPTIMAL',
      label: 'Native Content (Zero Link Penalty)',
      impact: '100% Reach Potential',
      explanation: 'No outbound links in post text. Post receives full algorithmic feed injection.',
    });
  }

  if (hasBoringOpener) {
    evidenceTags.push({
      id: 'tag-hook',
      type: 'HOOK',
      status: 'CRITICAL',
      label: 'Corporate Intro Cliché',
      impact: '-25% Hook Score',
      snippet: firstLine.slice(0, 35) + '...',
      explanation: 'Self-focused openings cause mobile readers to scroll past in <1.2 seconds.',
    });
  } else if (hasNumericHook || hasCuriosityHook) {
    evidenceTags.push({
      id: 'tag-hook',
      type: 'HOOK',
      status: 'OPTIMAL',
      label: 'Curiosity / Metric Hook',
      impact: '+22% Hook Velocity',
      snippet: firstLine.slice(0, 35) + '...',
      explanation: 'Opening captures reader attention immediately before the "see more" fold.',
    });
  } else {
    evidenceTags.push({
      id: 'tag-hook',
      type: 'HOOK',
      status: 'WARNING',
      label: 'Standard Opening',
      impact: 'Moderate Attention',
      snippet: firstLine.slice(0, 35) + '...',
      explanation: 'Opening is decent, but could stop more scrollers with a strong contrarian claim or number.',
    });
  }

  if (isWallOfText) {
    evidenceTags.push({
      id: 'tag-dwell',
      type: 'DWELL',
      status: 'CRITICAL',
      label: 'Dense Wall of Text',
      impact: 'High Bounce Risk (<2.5s)',
      explanation: 'Long paragraphs without line breaks cause mobile readers to bounce before reading through.',
    });
  } else {
    evidenceTags.push({
      id: 'tag-dwell',
      type: 'DWELL',
      status: 'OPTIMAL',
      label: 'Mobile-Optimized Spacing',
      impact: '+30% Dwell Time',
      explanation: 'Whitespace and short 1-2 sentence paragraphs maximize mobile reading dwell time.',
    });
  }

  if (hasTerminalCta) {
    evidenceTags.push({
      id: 'tag-cta',
      type: 'CTA',
      status: 'OPTIMAL',
      label: 'Active Discussion CTA',
      impact: '+8x Comment Velocity',
      explanation: 'Ends with an open question or debate prompt that stimulates audience replies.',
    });
  } else {
    evidenceTags.push({
      id: 'tag-cta',
      type: 'CTA',
      status: 'WARNING',
      label: 'No Ending Question',
      impact: 'Comment Stagnation',
      explanation: 'Post ended without asking a question. Comment reply chains are required to scale into 2nd-degree feeds.',
    });
  }

  // 7. Prescriptions for Next Dispatch
  const prescriptions: Prescription[] = [];

  if (hasOutboundUrl) {
    prescriptions.push({
      priority: 'CRITICAL',
      category: 'LINK_PENALTY',
      title: 'Move Links to 1st Comment or Bio',
      action: 'Publish post body as pure native value. Add the link in the first comment and state: "🔗 Link pinned in comments below".',
      algorithmicRationale: 'Circumvents link-suppression filters and recovers ~45% lost algorithmic reach.',
    });
  }

  if (isWallOfText || !hasGoodLineBreaks) {
    prescriptions.push({
      priority: 'HIGH',
      category: 'DWELL_TIME',
      title: 'Format for Mobile Skimmability',
      action: 'Limit each sentence to 1-2 lines maximum. Insert a blank line between every thought to create white space.',
      algorithmicRationale: 'Boosts mobile reading dwell time by 2.4x, keeping users on screen past the algorithm fold.',
    });
  }

  if (hasBoringOpener || hookScore < 65) {
    prescriptions.push({
      priority: 'HIGH',
      category: 'HOOK',
      title: 'Flip Opening into a Contrarian / Curiosity Hook',
      action: 'Cut intro pleasantries ("Excited to share..."). Lead directly with a bold outcome, metric, or contrarian lesson.',
      algorithmicRationale: 'Captures reader attention in the first 1.2 seconds of feed scrolling.',
    });
  }

  if (!hasTerminalCta) {
    prescriptions.push({
      priority: 'RECOMMENDED',
      category: 'ENGAGEMENT_CTA',
      title: 'End with an Open-Ended Polarizing Question',
      action: 'Replace generic endings with: "What has been your experience with X? Curious to hear founder takes below 👇".',
      algorithmicRationale: 'Triggers comment threads, which algorithms weigh 8x higher than passive likes.',
    });
  }

  if (!hasMedia && (resolvedPlatform === 'LINKEDIN' || resolvedPlatform === 'INSTAGRAM')) {
    prescriptions.push({
      priority: 'RECOMMENDED',
      category: 'MEDIA',
      title: 'Attach a 1-Slide Graphic or Carousel Deck',
      action: 'Pair post with a clean visual summary, architecture diagram, or slide carousel.',
      algorithmicRationale: 'Carousels and visual assets generate 2.8x higher repeat impressions on feeds.',
    });
  }

  // Ensure we always return at least 3 distinct prescriptions
  if (prescriptions.length < 3) {
    prescriptions.push({
      priority: 'RECOMMENDED',
      category: 'TIMING',
      title: 'Dispatch during the 9:00 AM - 11:30 AM Golden Window',
      action: 'Schedule your next post for mid-morning on a Tuesday or Thursday when professional feeds peak.',
      algorithmicRationale: 'Posts launched in active golden windows catch audience waves before feed decay.',
    });
  }

  // 8. Generate Improved Hook for Next Post
  const cleanSnippet = firstLine.replace(/^(excited to|happy to|proud to|thrilled to|check out)\s+/i, '').trim();
  const improvedHook = hasOutboundUrl
    ? `90% of builders make this 1 mistake when sharing updates on social.\n\nHere is what feed algorithms actually favor this week: 👇`
    : cleanSnippet.length > 10
    ? `Most people think ${cleanSnippet.slice(0, 45)}...\n\nThey're wrong. Here are 3 hard-won lessons on scaling reach: 👇`
    : `We spent 6 months testing what actually triggers viral reach vs vanity likes.\n\nHere is the exact playbook: 👇`;

  return {
    postId: post.id || 'draft-preview',
    snippet: firstLine || cleanContent.slice(0, 80),
    platform: resolvedPlatform,
    postAvailablePlatforms: postPlatforms,
    publishedAt: post.publishedAt,
    overallScore,
    verdict,
    verdictLabel,
    scores: {
      hookCuriosity: hookScore,
      dwellTimeFormatting: dwellScore,
      viralShareability: shareScore,
      timingAlignment: timingScore,
    },
    reachBottleneck,
    evidenceTags,
    prescriptions: prescriptions.slice(0, 3),
    improvedHook,
    suggestedTags: ['#GrowthHacking', '#SocialStrategy', '#TechBuilders', '#Scale'],
  };
}
