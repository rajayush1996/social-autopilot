import OpenAI from 'openai';
import config from '../config/env.js';
import logger from '../utils/logger.js';
import { convertMarkdownToUnicode } from '../utils/textFormatter.js';
import { fetchArticleContext } from './ai/articleFetcher.js';
import {
  SYSTEM_PROMPTS,
  buildArticleUserPrompt,
  buildFormattingInstructions,
  DEFAULT_PROMPT_CONFIG,
  MOCK_CASE_STUDIES,
} from './ai/promptTemplates.js';
import {
  getEmbedding,
  cosineSimilarity,
  checkAntiDuplicateShield,
  computeMMR,
  buildNegativeConstraints,
  STRUCTURAL_ARCHETYPES,
  selectStructuralArchetype,
  HOOK_ARCHETYPES,
  selectHookArchetype,
  fetchRecentUserPosts,
} from './ai/vectorMemoryService.js';
import { extractBrandAndVisualIntentWithAI } from '../utils/brandExtractor.js';

/**
 * Resolve an article URL into prompt context. Never throws: a failed fetch returns
 * an `{ url, error }` marker so the caller can degrade honestly instead of letting
 * the model invent the article's contents.
 */
export async function resolveArticleContext(articleUrl) {
  try {
    return await fetchArticleContext(articleUrl);
  } catch (err) {
    logger.warn(`[AIService] Article fetch failed for "${articleUrl}": ${err.message}`);
    return { url: articleUrl, error: err.message, code: err.code };
  }
}

const getOpenAIClient = () => {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }
  const apiKey = config.openai.apiKey;
  if (!apiKey || apiKey === 'your_openai_api_key_here' || apiKey.includes('placeholder') || apiKey.length < 25) {
    return null;
  }
  
  const clientConfig = { apiKey };
  // Allow DeepSeek or custom OpenAI-compatible base URLs
  if (config.openai.baseUrl) {
    clientConfig.baseURL = config.openai.baseUrl;
  }
  
  return new OpenAI(clientConfig);
};

/**
 * Fast Rule-Based Intent, Sentiment & Format Heuristic (0ms Latency).
 * Deconstructs raw user prompts into rich structured intent metadata.
 */
export function analyzePromptIntent({ prompt, platform = 'LINKEDIN', tone = 'ENGAGING', contentSummary = '' }) {
  const clean = extractCoreThought(prompt);

  // 1. Detect Spiritual / Devotional / Mindfulness
  const isSpiritual = /shiva|mahadev|om|namah|mantra|krishna|ram|bhagavad|gita|buddha|zen|spiritual|prayer|devot|peace|meditat|mindful|gratitude|soul|karma|temple|universe|god|blessing|divine|sacred/i.test(clean);

  // 2. Detect Culture / Festivals / Greetings
  const isFestival = /diwali|holi|eid|christmas|new year|festiv|celebrat|happy|wishes|congratulat/i.test(clean);

  // 3. Detect Motivational / Personal Growth / Wellness
  const isMotivational = /motivation|habit|discipline|mindset|fitness|workout|health|resilience|growth mindset|daily routine|morning routine/i.test(clean);

  // 4. Detect explicit Product / SaaS / Startup Case Study
  const isCaseStudy = /product teardown|case study|startup|saas|software tool|acquisition|acquire|funding|mrr|arr|arr growth|customer acquisition|b2b/i.test(clean);

  // 5. Detect General Business / Thought Leadership
  const isBusiness = /business|leadership|management|career|hiring|workplace|strategy|sales|marketing|engineering/i.test(clean);

  let primaryIntent = 'GENERAL_INSIGHT';
  let targetAudience = 'Followers, creators, and community network';
  let coreProblem = 'Delivering authentic perspective and inspiring value on the requested topic';
  let postType = 'INSPIRATIONAL_REFLECTIVE';
  let viralHookAngle = 'Resonant hook capturing the heart of the topic';

  if (isSpiritual) {
    primaryIntent = 'SPIRITUAL_DEVOTIONAL';
    targetAudience = 'Seekers, mindful individuals, community followers, and spiritual practitioners';
    coreProblem = 'Finding inner stillness, focus, resilience, and spiritual grounding in daily life';
    postType = 'DEVOTIONAL_MINDFULNESS';
    viralHookAngle = 'Deep spiritual reflection, sacred mantra significance, or inner peace lesson';
  } else if (isFestival) {
    primaryIntent = 'CULTURE_FESTIVAL';
    targetAudience = 'Community, friends, network, and celebration followers';
    coreProblem = 'Sharing festive warmth, auspicious blessings, and joyful celebration';
    postType = 'FESTIVE_GREETING';
    viralHookAngle = 'Heartfelt festive greeting with inspirational meaning';
  } else if (isMotivational) {
    primaryIntent = 'MOTIVATION_WELLNESS';
    targetAudience = 'Individuals striving for self-improvement, discipline, and daily motivation';
    coreProblem = 'Overcoming stagnation, building lasting habits, and staying disciplined';
    postType = 'MOTIVATIONAL_GUIDE';
    viralHookAngle = 'Transformational habit, mindset shift, or empowering reality check';
  } else if (isCaseStudy) {
    primaryIntent = 'PRODUCT_CASE_STUDY';
    targetAudience = 'Founders, Product Leaders & Tech Innovators';
    coreProblem = 'Solving real-world customer friction & product-led scale';
    postType = 'STORY_CASE_STUDY';
    viralHookAngle = 'Bold contrarian insight or forensic teardown of product success';
  } else if (isBusiness) {
    primaryIntent = 'BUSINESS_INSIGHT';
    targetAudience = 'Industry professionals, entrepreneurs, and team leaders';
    coreProblem = 'Navigating modern career, business, and operational challenges';
    postType = 'STRATEGIC_INSIGHT';
    viralHookAngle = 'Actionable industry lesson or perspective';
  }

  return {
    primaryIntent,
    targetAudience,
    emotionalTone: tone.toLowerCase(),
    coreProblem,
    entities: [],
    primarySubject: clean,
    executionStrategy: 'AUTHENTIC_RELEVANCE',
    postType,
    viralHookAngle,
    cleanPrompt: clean,
  };
}

/**
 * Generate post content using the Multi-Agent Critic-Refiner Cognitive Pipeline
 * with Vector Memory, MMR Diversity, Anti-Duplicate Shield, and Archetype Rotation.
 */
export async function generatePostContent({ 
  prompt, 
  platform = 'GENERAL', 
  tone = 'ENGAGING', 
  topic, 
  contentSummary,
  brandContext,
  emojiDensity = 'MEDIUM',
  hashtagCount = 'MODERATE',
  formatStyle = 'SINGLE',
  contentLength = 'BALANCED',
  articleUrl,
  articleContext,
  isXPremium = false,
  includeImage = false,
  userId = null,
}) {
  const openai = getOpenAIClient();
  const inputTopic = prompt || topic;

  if (!inputTopic && !articleUrl) {
    throw new Error('A prompt, topic, or article URL is required to generate AI content.');
  }

  const cleanTopic = extractCoreThought(inputTopic);

  // Fetch the article itself when the caller has not already resolved it, so the
  // model works from the real text instead of guessing from the URL slug.
  let resolvedArticle = articleContext || null;
  if (articleUrl && !resolvedArticle) {
    resolvedArticle = await resolveArticleContext(articleUrl);
  }

  const model = config.openai.model || 'gpt-4o-mini';

  // Prefer the real article title over the raw URL as the template/mock topic.
  const fallbackTopic = cleanTopic || resolvedArticle?.title || articleUrl;

  if (!openai) {
    logger.warn('⚠️ OPENAI_API_KEY not configured. Using intelligent template generator.');
    return {
      ...generateMockPostContent({
        prompt: fallbackTopic,
        platform,
        tone,
        emojiDensity,
        hashtagCount,
        formatStyle,
        model: 'mock-template-engine',
      }),
      ...(articleUrl && { sourceUrl: resolvedArticle?.finalUrl || articleUrl }),
      ...(resolvedArticle?.error && { articleWarning: resolvedArticle.error }),
    };
  }

  try {
    // =========================================================================
    // STAGE 0: RELEVANCE & DIVERSITY CONTEXT RETRIEVAL (Vector Memory & MMR)
    // =========================================================================
    let recentPosts = [];
    if (userId) {
      try {
        recentPosts = await fetchRecentUserPosts({ userId, days: 14, limit: 15 });
      } catch (dbErr) {
        logger.warn(`[AIService] Could not fetch recent posts for memory: ${dbErr.message}`);
      }
    }

    // Explicit Negative Constraints Block (The Blacklist)
    const negativeConstraints = buildNegativeConstraints({ recentPosts, count: 5 });

    // Archetype and Hook Selection
    const archetype = selectStructuralArchetype({ requestedFormat: formatStyle, recentPosts });
    const hookStyle = selectHookArchetype();

    // Intent Analysis
    const intentMeta = await analyzePromptIntent({ prompt: cleanTopic, platform, tone, contentSummary });

    // Format Flags
    const rawFmt = (formatStyle || 'PARAGRAPHS').toUpperCase();
    const fmt = rawFmt;
    const isParagraphs = ['PARAGRAPHS', 'SINGLE', 'STANDARD'].includes(fmt) || fmt.startsWith('PARAGRAPHS_') || fmt === 'DYNAMIC_AUTO';
    const isBullets = ['BULLETS', 'BULLET_POINTS', 'LIST'].includes(fmt) || fmt.startsWith('BULLETS_');
    const isOneLiners = ['ONE_LINERS', 'ONE_LINER', 'PUNCHY'].includes(fmt) || fmt.startsWith('ONE_LINERS_');
    const isCarousel = ['CAROUSEL', 'SLIDES'].includes(fmt) || fmt.startsWith('CAROUSEL_');

    // =========================================================================
    // STAGE 1: THE GENERATOR AGENT (Creative Drafting)
    // =========================================================================
    let systemPrompt = SYSTEM_PROMPTS[platform.toUpperCase()] || SYSTEM_PROMPTS.GENERAL;

    if (platform.toUpperCase() === 'X') {
      if (isXPremium) {
        systemPrompt = `You are a viral X (Twitter) Premium Copywriter. The target X account is an X Premium subscriber, long-form posts allowed.`;
      } else {
        systemPrompt = `You are a viral X (Twitter) Copywriter. Strictly keep single tweets under 270 characters, punchy, clear hook.`;
      }
    }

    const isNonBusinessTopic = ['SPIRITUAL_DEVOTIONAL', 'CULTURE_FESTIVAL', 'MOTIVATION_WELLNESS'].includes(intentMeta.primaryIntent);
    if (brandContext && !isNonBusinessTopic) {
      systemPrompt += `\n\n[USER BRAND VOICE & CONTEXT]\n${brandContext}`;
    }
    if (contentSummary) {
      systemPrompt += `\n\n[USER CONTENT MEMORY & CONSTRAINTS]\n${contentSummary}\n\nCRITICAL INSTRUCTION: Do NOT duplicate concepts, hooks, phrasing, or core angles`;
    }

    // Inject Vector Memory Negative Constraints
    if (negativeConstraints) {
      systemPrompt += `\n\n${negativeConstraints}`;
    }

    // Inject Structural Archetype & Dynamic Hook Directives
    systemPrompt += `\n\n[EXECUTION ARCHETYPE & HOOK DIRECTIVE]\n${archetype.directive}\n- HOOK STRATEGY: ${hookStyle.name} -> ${hookStyle.instruction}`;

    systemPrompt += buildFormattingInstructions({ emojiDensity, hashtagCount, formatStyle, contentLength, tone });

    const userPrompt = articleUrl
      ? buildArticleUserPrompt({ articleUrl, article: resolvedArticle, inputTopic: cleanTopic, tone, platform })
      : `[AI DEEP INTENT & EXECUTION DIRECTIVE]
- Topic Domain: ${intentMeta.primaryIntent}
- Target Audience: ${intentMeta.targetAudience}
- Emotional Tone: ${intentMeta.emotionalTone}
- Core Focus: ${intentMeta.coreProblem}
- Primary Subject: ${intentMeta.primarySubject}

[USER CORE INSTRUCTION & TOPIC]
"${intentMeta.cleanPrompt}"
${contentSummary ? `\n[MANDATORY EXCLUSIONS & DIVERSITY INSTRUCTION]\n${contentSummary}\nDo NOT repeat or write about any of the excluded companies or products above.` : ''}

CRITICAL SYNTHESIS INSTRUCTIONS:
1. TOPIC INTEGRITY FIRST: Write an authentic, compelling ${platform} post strictly about the user's prompt: "${intentMeta.cleanPrompt}".
2. DOMAIN RELEVANCE:
   - If Topic Domain is SPIRITUAL_DEVOTIONAL: Write a profound, respectful, and uplifting reflection celebrating the mantra, deity, spiritual philosophy, or mindfulness practice. Focus on inner peace, stillness amid chaos, resilience, and personal grounding. NEVER treat spiritual mantras or deities as a tech startup, app, or SaaS company! Never invent fake companies, fake founders, or fake website links!
   - If Topic Domain is CULTURE_FESTIVAL: Write a warm, festive, and inspiring celebration post with good wishes and cultural depth.
   - If Topic Domain is MOTIVATION_WELLNESS: Focus on genuine daily discipline, mindset shifts, and actionable growth habits.
   - If Topic Domain is PRODUCT_CASE_STUDY: Break down ${intentMeta.primarySubject} with an authentic, fresh perspective. Focus on the counter-intuitive execution choice, surprising architectural or growth insight, or why conventional wisdom failed. NEVER default to the tired formula "don't add features—they remove friction". Write fresh, dynamic observations.
   - If Topic Domain is BUSINESS_INSIGHT / GENERAL_INSIGHT: Deliver high-signal, practical industry insights.
3. NO FAKE URLS OR HALLUCINATED APPS: Never invent or hallucinate fake website links (like www.omnamahshivaye.com). Only include a website link if the user explicitly provided a URL in their prompt or if it is an established, real-world company in a case study.
4. HOOK: Open with a captivating first line matching "${hookStyle.name}" that matches the tone (${tone}) and topic naturally.
5. FORMATTING & DWELL TIME: Keep paragraphs strictly to 1-2 punchy sentences with clean line breaks.
6. FORMAT INTEGRITY MANDATE (${fmt}): ${
  isParagraphs
    ? 'The user selected STANDARD PARAGRAPHS. You MUST write exclusively in natural, flowing prose paragraphs separated by blank lines. STRICT PROHIBITION: DO NOT use bullet points (no •, -, *), and DO NOT use numbered list takeaways (no "📌 1. EMBRACE...", no "1.", no "2.", no "Key Reflections:"). Weave all insights, reflections, and lessons smoothly into cohesive prose paragraphs.'
    : isBullets
    ? 'The user selected BULLET POINTS LIST. Present 3 to 5 clear takeaways or reflections formatted with clean UPPERCASE headers and bullet markers or emojis (e.g., 01., 02., 03. or clean bold bullet markers).'
    : isOneLiners
    ? 'The user selected PUNCHY ONE-LINERS. Write in single, impactful statements separated by blank lines with high white-space. No multi-sentence paragraph blocks and no bullet characters.'
    : isCarousel
    ? 'The user selected CAROUSEL SLIDE DECK. Structure the output slide-by-slide with clear demarcations ([SLIDE 1] to [SLIDE 5]).'
    : `Adhere strictly to the requested ${formatStyle} structure.`
}
7. CALL TO ACTION: End with a thoughtful, engaging question or reflection that invites readers to comment and share their perspective.
8. EMOJI DENSITY MANDATE: Follow user choice (${emojiDensity}): ${
  ['NONE', 'ZERO'].includes((emojiDensity || '').toUpperCase())
    ? 'Strictly ZERO emojis (0 emojis across the entire post).'
    : ['MINIMAL', 'LOW'].includes((emojiDensity || '').toUpperCase())
    ? 'Include only 1 to 2 subtle emojis at the opening or closing.'
    : ['EXPRESSIVE', 'HIGH'].includes((emojiDensity || '').toUpperCase())
    ? 'Include 5+ vibrant emojis placed naturally throughout the text.'
    : 'Include 2 to 4 tasteful emojis placed contextually.'
}
9. HASHTAG STRATEGY MANDATE: Follow user choice (${hashtagCount}): ${
  ['NONE', 'ZERO'].includes((hashtagCount || '').toUpperCase())
    ? 'Do NOT include any hashtags (0 hashtags).'
    : ['MAX_REACH', 'HEAVY', 'VIRAL_12', 'GROWTH_8'].includes((hashtagCount || '').toUpperCase())
    ? 'Include 6 to 10 targeted niche hashtags separated at the very end.'
    : 'Include 2 to 4 targeted hashtags separated at the very end.'
}
10. LINK & TAG MANDATE: If the user prompt explicitly mentions a website URL, link, or custom tag value (such as www.google.com or {{link}}), you MUST include that exact URL link or tag in the final post content.
11. ANTI-BOT NATURAL VOICE: Write like an authentic human practitioner with varied sentence lengths (burstiness). Strictly avoid repetitive AI clichés ("In today's fast-paced world", "tapestry", "delve into", "game-changer", "testament", "Let that sink in", "Agree?"). STRICTLY FORBID "🎯 Moral of the story:" or schoolteacher lectures.
12. Output ONLY the ready-to-publish post content without meta-commentary, quotation marks, or prompt headers.`;

    if (includeImage) {
      systemPrompt += `\n\n[MANDATORY SINGLE-PASS MULTI-MODAL OUTPUT FORMAT]\nYou MUST return ONLY a strictly valid JSON object containing both the post copy and visual metadata for image generation:
{
  "content": "Full formatted post content here with emoji headers, takeaways, and CTA question.",
  "visualMeta": {
    "brandName": "Exact primary company/startup/brand/deity name featured in post, or null if none",
    "coreSubject": "Primary hero subject or problem solved (max 5 words)",
    "niche": "TECH_STARTUP | DEVTOOLS | SPIRITUAL | SPORTS | FINTECH | PRODUCTIVITY | GENERAL_BUSINESS",
    "visualPrompt": "A single compelling 3D minimalist image generation prompt (max 35 words) specifying visual elements, lighting, and product UI/metaphor for this exact subject. No distorted text."
  }
}`;
    }

    let completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: archetype.temperature || 0.84,
      top_p: archetype.top_p || 0.92,
      presence_penalty: 0.5,
      frequency_penalty: 0.3,
      max_tokens: 1200,
      ...(includeImage && { response_format: { type: 'json_object' } }),
    });

    let rawResponse = completion.choices[0]?.message?.content?.trim() || '';
    let rawDraft = rawResponse;
    let visualMeta = null;

    if (includeImage) {
      try {
        const parsed = JSON.parse(rawResponse);
        if (parsed.content) {
          rawDraft = parsed.content;
          visualMeta = parsed.visualMeta || null;
        }
      } catch (jsonErr) {
        logger.warn(`[AIService] Single-pass JSON parse fallback: ${jsonErr.message}`);
      }
    }

    let workingDraft = rawDraft;

    // =========================================================================
    // STAGE 2: THE CRITIC & QUALITY GATEKEEPER AGENT
    // =========================================================================
    let shieldResult = { passed: true, maxSimilarity: 0 };
    if (recentPosts && recentPosts.length > 0) {
      try {
        shieldResult = await checkAntiDuplicateShield({
          candidateText: workingDraft,
          recentPosts,
          threshold: 0.85,
        });

        // If duplicate detected, auto-pivot angle with higher temperature & alternate archetype
        if (shieldResult.isDuplicate) {
          logger.warn(`[AntiDuplicateShield] High cosine similarity detected (${shieldResult.maxSimilarity}) matching hook "${shieldResult.matchedHook}". Triggering angle pivot...`);
          const pivotArchetype = selectStructuralArchetype({ requestedFormat: formatStyle, recentPosts, retryCount: 1 });
          const pivotPrompt = `${userPrompt}\n\n[CRITICAL REJECTION DIRECTIVE]: Your previous draft had a similarity score of ${shieldResult.maxSimilarity} with recent post "${shieldResult.matchedHook}". You MUST pivot 180 degrees. Use a completely novel hook, different perspective, and the following alternative framework:\n${pivotArchetype.directive}`;

          const retryCompletion = await openai.chat.completions.create({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: pivotPrompt },
            ],
            temperature: 0.88,
            top_p: 0.95,
            presence_penalty: 0.6,
            max_tokens: 1200,
            ...(includeImage && { response_format: { type: 'json_object' } }),
          });

          const retryRaw = retryCompletion.choices[0]?.message?.content?.trim() || '';
          if (includeImage) {
            try {
              const parsed = JSON.parse(retryRaw);
              if (parsed.content) {
                workingDraft = parsed.content;
                visualMeta = parsed.visualMeta || visualMeta;
              }
            } catch (_) {
              workingDraft = retryRaw;
            }
          } else {
            workingDraft = retryRaw;
          }

          // Re-evaluate shield score
          shieldResult = await checkAntiDuplicateShield({
            candidateText: workingDraft,
            recentPosts,
            threshold: 0.85,
          });
        }
      } catch (shieldErr) {
        logger.warn(`[AntiDuplicateShield] Shield check error: ${shieldErr.message}`);
      }
    }

    // Critic Quality & Directives Audit
    const criticDirectives = [];

    // 1. Format Integrity Audit
    if (isParagraphs && (/[•\*\-]\s+|📌|\d+\.\s+[A-Z]/.test(workingDraft))) {
      criticDirectives.push('FORMAT VIOLATION: The user selected STANDARD PARAGRAPHS. Strip all bullet markers (•, -, *), numbered takeaways, and pins (📌 1.). Weave all insights into flowing prose paragraphs separated by clean blank lines.');
    }

    // 2. Length Audit
    const wordCount = workingDraft.split(/\s+/).filter(Boolean).length;
    const upperLen = (contentLength || 'BALANCED').toUpperCase();
    if (upperLen === 'CONCISE' || upperLen === 'SHORT') {
      if (wordCount > 75) {
        criticDirectives.push(`LENGTH MANDATE: Current draft is ${wordCount} words. Trim down to 40-70 words maximum. Be punchy, direct, and high-signal.`);
      }
    } else if (upperLen === 'LONG_FORM' || upperLen === 'DETAILED') {
      if (wordCount < 160) {
        criticDirectives.push(`LENGTH MANDATE: Current draft is ${wordCount} words. Expand with deeper context, practical mechanics, or real-world example to 250-450 words.`);
      }
    }

    // 3. Preachiness & AI Cliché Audit
    if (/moral of the story|key takeaway|unpopular truth: the best products|delve|testament|tapestry|game-changer|let that sink in|read that again|agree\?/i.test(workingDraft)) {
      criticDirectives.push('ANTI-CLICHÉ MANDATE: Eliminate robotic phrases like "Moral of the story:", "game-changer", "let that sink in", "delve", and "Agree?". Speak in an authentic peer-to-peer practitioner voice without schoolteacher preachiness.');
    }

    // 4. Emoji Audit
    const upperEmoji = (emojiDensity || 'BALANCED').toUpperCase();
    const emojiCount = (workingDraft.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/gu) || []).length;
    if (upperEmoji === 'NONE' || upperEmoji === 'ZERO') {
      if (emojiCount > 0) criticDirectives.push('EMOJI MANDATE: The user selected ZERO emojis. Remove all emojis from the text.');
    } else if (upperEmoji === 'MINIMAL' || upperEmoji === 'LOW') {
      if (emojiCount > 2) criticDirectives.push('EMOJI MANDATE: The user selected MINIMAL emojis. Reduce emojis to at most 1-2 subtle, tasteful emojis.');
    }

    // =========================================================================
    // STAGE 3: THE REFINER & POLISHER AGENT (Humanizer & Rhythm)
    // =========================================================================
    let finalContent = workingDraft;
    let refinerTokens = 0;
    try {
      const refinerMessages = [
        {
          role: 'system',
          content: `You are an elite Social Media Copy Editor & Voice Polisher.
Your job is to polish the provided raw draft into the final, ready-to-publish ${platform} post.

CRITICAL EDITORIAL RULES:
1. BURSTINESS & RHYTHM: Ensure high burstiness. Vary sentence lengths naturally (e.g. 4-word punchy sentence, followed by an 18-word descriptive sentence, followed by a short punchline). Defeat platform AI detectors by eliminating robotic, uniform sentence cadences.
2. ZERO PREACHINESS & BANNED BUZZWORDS: Never lecture the reader. Strictly NEVER use phrases like "game-changer", "delve", "testament", "tapestry", "let that sink in", "read that again", "Moral of the story:", "Key takeaway:", or forced summaries. Speak like an authentic human peer.
3. DWELL-TIME FORMATTING: Ensure mobile readability with 1-2 sentence paragraphs separated by clean blank lines.
4. HASHTAGS: Place any hashtags at the very bottom of the post after a double blank line.
5. PRESERVE TAGS & PLACEHOLDERS: If the draft contains variables like {{link}} or __PLACEHOLDER_X__, preserve them EXACTLY as they are.
6. CRITIC DIRECTIVES:
${criticDirectives.length > 0 ? criticDirectives.map((d, i) => `${i + 1}. ${d}`).join('\n') : '- Preserve the core message, heighten human conversational voice, and sharpen punchiness.'}

Return ONLY the polished final post copy. No meta-commentary, no markdown code blocks, no quotes around the whole post.`
        },
        {
          role: 'user',
          content: `Raw Draft to Polish:\n"""\n${workingDraft}\n"""`
        }
      ];

      const refinerCompletion = await openai.chat.completions.create({
        model: model,
        messages: refinerMessages,
        temperature: 0.65,
        max_tokens: 1000,
      });

      const refinedText = refinerCompletion.choices[0]?.message?.content?.trim();
      if (refinedText && refinedText.length > 20) {
        finalContent = refinedText;
        refinerTokens = refinerCompletion.usage?.total_tokens || 0;
      }
    } catch (refinerErr) {
      logger.warn(`[AIService] Refiner stage error (falling back to working draft): ${refinerErr.message}`);
      finalContent = workingDraft;
    }

    const formattedContent = convertMarkdownToUnicode(finalContent);

    return {
      success: true,
      content: formattedContent,
      visualMeta,
      platform,
      tone,
      modelUsed: model,
      tokensUsed: (completion.usage?.total_tokens || 0) + refinerTokens,
      isMock: false,
      archetype: archetype.name,
      antiDuplicateShield: {
        passed: !shieldResult.isDuplicate,
        maxSimilarity: shieldResult.maxSimilarity,
        checkedAgainstCount: recentPosts.length,
      },
      ...(articleUrl && { sourceUrl: resolvedArticle?.finalUrl || articleUrl }),
      ...(resolvedArticle?.error && { articleWarning: resolvedArticle.error }),
    };
  } catch (error) {
    logger.error(`❌ Error during OpenAI content generation: ${error.message}`);
    return {
      ...generateMockPostContent({
        prompt: fallbackTopic,
        platform,
        tone,
        emojiDensity,
        hashtagCount,
        formatStyle,
        model: `${model} (fallback)`,
        errorNotice: error.message,
      }),
      ...(articleUrl && { sourceUrl: resolvedArticle?.finalUrl || articleUrl }),
      ...(resolvedArticle?.error && { articleWarning: resolvedArticle.error }),
    };
  }
}

/**
 * Adapt a single master post content into optimized versions for selected platforms.
 */
export async function optimizePostForPlatforms({ 
  content, 
  platforms = ['INSTAGRAM', 'LINKEDIN', 'X'], 
  tone = 'PROFESSIONAL', 
  contentSummary,
  brandContext,
  emojiDensity,
  hashtagCount,
  formatStyle,
  contentLength,
  articleUrl,
  articleContext,
  userId = null,
}) {
  const results = {};

  // Resolve the article once for the whole batch instead of per platform.
  const resolvedArticle = articleUrl ? articleContext || (await resolveArticleContext(articleUrl)) : null;

  for (const platform of platforms) {
    const result = await generatePostContent({
      prompt: content ? extractCoreThought(content) : '',
      platform: platform.toUpperCase(),
      tone,
      contentSummary,
      brandContext,
      emojiDensity,
      hashtagCount,
      formatStyle,
      contentLength,
      articleUrl,
      articleContext: resolvedArticle,
      userId,
    });
    results[platform.toUpperCase()] = result.content;
  }

  // Synthesize unified visual directive & hero hook blueprint from primary post
  const primaryPlatform = platforms[0]?.toUpperCase() || 'LINKEDIN';
  const sampleContent = results[primaryPlatform] || Object.values(results)[0] || content;

  let visualMeta = null;
  try {
    visualMeta = await extractBrandAndVisualIntentWithAI({
      content: sampleContent,
      topic: content,
      tone,
    });
  } catch (err) {
    logger.warn(`[AIService] Visual metadata synthesis warning: ${err.message}`);
  }

  return {
    success: true,
    originalContent: content,
    adaptedPosts: results,
    visualMeta,
  };
}

/**
 * Fallback AI Generator when OpenAI key is missing or encounters errors.
 */
function generateMockPostContent({ prompt, platform, tone, emojiDensity, hashtagCount, formatStyle, model, errorNotice }) {
  let content = '';
  const uppercasePlatform = (platform || 'GENERAL').toUpperCase();
  const rawPrompt = prompt || 'Mindful focus and intentional growth';
  const cleanPrompt = extractCoreThought(rawPrompt);

  const isSpiritual = /shiva|mahadev|om|namah|mantra|krishna|ram|bhagavad|gita|buddha|zen|spiritual|prayer|devot|peace|meditat|mindful|gratitude|soul|karma|temple|universe|god|blessing|divine|sacred/i.test(cleanPrompt);
  const isFestival = /diwali|holi|eid|christmas|new year|festiv|celebrat|happy|wishes|congratulat/i.test(cleanPrompt);
  const isMotivational = /motivation|habit|discipline|mindset|fitness|workout|health|resilience|growth mindset|daily routine|morning routine/i.test(cleanPrompt);
  const isCaseStudy = /product teardown|case study|startup|saas|software tool|acquisition|acquire|funding|mrr|arr|customer acquisition|b2b/i.test(cleanPrompt);

  let emojiHeader = emojiDensity === 'NONE' ? '' : emojiDensity === 'HIGH' ? (isSpiritual ? '🕉️✨🧘‍♂️ ' : '🚀🔥✨ ') : (isSpiritual ? '🕉️ ' : '💡 ');
  let hashtags = '';
  if (hashtagCount === 'MODERATE') {
    if (isSpiritual) hashtags = '\n\n#OmNamahShivaya #InnerPeace #Mindfulness #SpiritualReflection';
    else if (isFestival) hashtags = '\n\n#FestiveVibes #Celebration #Joy #Blessings';
    else if (isMotivational) hashtags = '\n\n#Mindset #Motivation #DailyHabits #PersonalGrowth';
    else hashtags = '\n\n#ProductStrategy #Innovation #BusinessGrowth #Leadership';
  } else if (hashtagCount === 'HEAVY') {
    if (isSpiritual) hashtags = '\n\n#OmNamahShivaya #InnerPeace #Mindfulness #SpiritualReflection #Meditation #DailyWisdom #Devotion';
    else if (isFestival) hashtags = '\n\n#FestiveVibes #Celebration #Joy #Blessings #Peace #Community #Gratitude';
    else if (isMotivational) hashtags = '\n\n#Mindset #Motivation #DailyHabits #PersonalGrowth #Discipline #SuccessMindset';
    else hashtags = '\n\n#StartupStory #ProductStrategy #Innovation #BusinessGrowth #TechTrends #Entrepreneurship #SaaS';
  }

  // Rotate case study based on timestamp day/hash so it changes every single day (only for case study or generic B2B)
  const caseIdx = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % MOCK_CASE_STUDIES.length;
  const study = MOCK_CASE_STUDIES[caseIdx];

  const fmt = (formatStyle || 'PARAGRAPHS').toUpperCase();
  const isParagraphs = ['PARAGRAPHS', 'SINGLE', 'STANDARD'].includes(fmt) || fmt.startsWith('PARAGRAPHS_') || fmt === 'DYNAMIC_AUTO';

  if (isSpiritual) {
    switch (uppercasePlatform) {
      case 'INSTAGRAM':
        if (isParagraphs) {
          content = `${emojiHeader}${cleanPrompt}\n\nIn the midst of life's chaotic demands, finding inner stillness is where true clarity begins. Each moment spent centering the mind reveals a calm sanctuary within.\n\nTake a deep breath and connect with your inner peace today. Strength and resilience always start from within.\n\n👇 Har Har Mahadev! Share what brings you stillness today!${hashtags}`;
        } else {
          content = `${emojiHeader}${cleanPrompt}\n\nFinding inner stillness amidst life's chaos.\n\nKey Reflections:\n✨ 1. INNER CALM: Ground yourself in the present moment.\n✨ 2. DETACHMENT: Let go of outcomes outside your control.\n✨ 3. RESILIENCE: True strength and clarity begin from within.\n\nTake a deep breath and center your spirit today.\n\n👇 Har Har Mahadev! Share what brings you peace today!${hashtags}`;
        }
        break;
      case 'LINKEDIN':
        if (isParagraphs) {
          content = `${emojiHeader}${cleanPrompt}\n\nIn high-pressure environments, the ancient wisdom of mindfulness and inner grounding is more essential than ever. Pausing to center our thoughts creates an oasis of clarity amid daily noise.\n\nTrue resilience begins from within. When we let go of controlling external friction and anchor our awareness in stillness, we show up with greater presence, focus, and purpose.\n\nMay this sacred thought bring peace, grounding, and inner clarity to your journey today.\n\n💡 How do you stay centered and grounded during demanding days? Let's reflect below.${hashtags}`;
        } else {
          content = `${emojiHeader}${cleanPrompt}\n\nIn high-pressure environments, the ancient wisdom of mindfulness and inner grounding is more essential than ever.\n\n3 Reflections for Mindful Focus:\n📌 1. STILLNESS AMID NOISE: Real clarity begins when you pause the mental clutter.\n📌 2. INTENTION OVER REACTION: Control your responses instead of reacting to external chaos.\n📌 3. RESILIENCE FROM WITHIN: Inner peace provides the foundation to navigate any storm.\n\nMay this chant bring peace, purpose, and clarity to your journey.\n\n💡 How do you stay centered and grounded during demanding days? Let's reflect below.${hashtags}`;
        }
        break;
      case 'X':
      case 'TWITTER':
        content = `🕉️ ${cleanPrompt}\n\nStillness isn't the absence of chaos—it's inner peace in the middle of it.\n\nPause. Breathe. Ground yourself.\n\nHar Har Mahadev 🙏${hashtags}`;
        break;
      case 'FACEBOOK':
        content = `${emojiHeader}${cleanPrompt} 🙏\n\nMay the sacred vibrations bring peace, health, and profound stillness to you and your loved ones today.\n\nSending blessings and light to everyone reading this! ✨${hashtags}`;
        break;
      default:
        content = `${emojiHeader}${cleanPrompt}\n\nMay this sacred thought bring you peace, grounding, and inner strength today. 🙏${hashtags}`;
        break;
    }
  } else if (isCaseStudy) {
    switch (uppercasePlatform) {
      case 'INSTAGRAM':
        content = `${emojiHeader}${study.headline}\n\nCase Study: ${study.company}\n\n${study.story}\n\nKey Takeaways:\n1. The Problem: ${study.problem}\n2. Core Takeaway: ${study.takeaway || study.moral}\n\n👇 Drop a comment below if you agree!${hashtags}`;
        break;
      case 'LINKEDIN':
        if (isParagraphs) {
          content = `${emojiHeader}${study.headline}\n\nCase Study spotlight on **${study.company}**:\n\n${study.story}\n\nWhen we look closely at how this was built, the core lesson is clear: customer friction comes first. By eliminating complex steps in the daily routine, sustainable product-led scale followed naturally. Ultimately, ${study.takeaway || study.moral}\n\nWhat is one product you rely on every single day? Share your thoughts below!${hashtags}`;
        } else {
          const bulletEmoji = emojiDensity === 'NONE' ? '•' : '📌';
          content = `${emojiHeader}${study.headline}\n\nCase Study spotlight on **${study.company}**:\n${study.story}\n\n3 Key Actionable Takeaways:\n${bulletEmoji} **Customer Friction First:** ${study.problem}\n${bulletEmoji} **Product-Led Scale:** Build solutions that fit seamlessly into daily routines.\n${bulletEmoji} **Core Takeaway:** ${study.takeaway || study.moral}\n\nWhat is one product you rely on every single day? Share your thoughts below!${hashtags}`;
        }
        break;
      case 'X':
      case 'TWITTER':
        content = `🧵 Case Study: ${study.company}\n\n1/ ${study.headline}\n\n2/ Problem: ${study.problem}\n\n3/ Solution: ${study.story}\n\n4/ Takeaway: ${study.takeaway || study.moral}${hashtags}`;
        break;
      case 'FACEBOOK':
        content = `${emojiHeader}Hey Community! 👋\n\n${study.headline}\n\n${study.story}\n\nKey Takeaway: ${study.takeaway || study.moral}\n\nWhat product saved your workflow this week? Comment below!${hashtags}`;
        break;
      default:
        content = `${emojiHeader}${study.headline}\n\n${study.story}\n\nTakeaway: ${study.takeaway || study.moral}${hashtags}`;
        break;
    }
  } else {
    // General / Motivational / Thought Leadership
    switch (uppercasePlatform) {
      case 'INSTAGRAM':
        if (isParagraphs) {
          content = `${emojiHeader}${cleanPrompt}\n\nReal progress comes from focusing on what truly moves the needle. Consistency will always beat intensity, and clarity follows action rather than overthinking.\n\n👇 What's your biggest focus this week? Drop a comment below!${hashtags}`;
        } else {
          content = `${emojiHeader}${cleanPrompt}\n\n3 Key Lessons:\n✨ 1. Focus on what truly moves the needle.\n✨ 2. Consistency beats intensity every single time.\n✨ 3. Clarity follows action, not overthinking.\n\n👇 What's your biggest focus this week? Drop a comment below!${hashtags}`;
        }
        break;
      case 'LINKEDIN':
        if (isParagraphs) {
          content = `${emojiHeader}${cleanPrompt}\n\nIn work and in life, sustainable progress comes from prioritizing high-impact levers that create compounding value. Daily habits consistently outperform occasional bursts of motivation.\n\nWhen we commit to steady execution and adapt based on real feedback, clarity naturally follows action.\n\n💡 What perspective resonates most with you? Let's discuss in the comments below.${hashtags}`;
        } else {
          content = `${emojiHeader}${cleanPrompt}\n\nKey Actionable Insights:\n📌 1. PRIORITIZE HIGH-IMPACT LEVERS: Focus on fundamentals that create compounding value.\n📌 2. CONSISTENT EXECUTION: Daily habits consistently outperform occasional bursts of motivation.\n📌 3. ADAPT AND REFLECT: Continuously refine your approach based on real feedback.\n\n💡 What perspective resonates most with you? Let's discuss in the comments below.${hashtags}`;
        }
        break;
      case 'X':
      case 'TWITTER':
        content = `${emojiHeader}${cleanPrompt}\n\n1. Focus on fundamentals.\n2. Consistency beats intensity.\n3. Action creates clarity.\n\nWhat are you focusing on today? 👇${hashtags}`;
        break;
      case 'FACEBOOK':
        content = `${emojiHeader}Hey friends! 👋\n\n${cleanPrompt}\n\nRemember: Consistency and clarity always win in the long run.\n\nWhat's your main priority this week? Share below!${hashtags}`;
        break;
      default:
        content = `${emojiHeader}${cleanPrompt}\n\nKey takeaway: Action creates clarity and consistency builds lasting results.${hashtags}`;
        break;
    }
  }

  return {
    success: true,
    content: convertMarkdownToUnicode(content),
    platform: uppercasePlatform,
    tone,
    modelUsed: model || 'mock-ai-engine',
    tokensUsed: 0,
    isMock: true,
    ...(errorNotice && { warning: `OpenAI API returned error: ${errorNotice}. Used fallback template.` })
  };
}

/**
 * Helper: Recursively unwrap nested prompt enhancement strings to extract true core thought.
 */
function extractCoreThought(text) {
  if (!text) return '';
  let cleaned = text.trim();
  // Strip any existing [PROMPT DIRECTIVE] blocks to prevent recursive duplication
  cleaned = cleaned.replace(/\n*\[PROMPT DIRECTIVE\]:[\s\S]*/gi, '').trim();
  
  // Strip outer quotes and common template prefixes/headers
  cleaned = cleaned.replace(/^💡\s*/gi, '');
  cleaned = cleaned.replace(/^How to master\s*/gi, '');
  cleaned = cleaned.replace(/^Adapt this core message for [^:]+:\s*"?/gi, '');
  cleaned = cleaned.replace(/^Create a (?:high-converting|viral)\s*[^:]+\s*post focusing on:\s*"?/gi, '');
  cleaned = cleaned.replace(/\s*in \d{4}$/gi, '');

  let prev;
  do {
    prev = cleaned;
    // Unwrap nested 'Write a viral, high-converting ... post about "... "'
    cleaned = cleaned.replace(/^Write a (?:viral,\s*)?high-converting \w+ post about "([\s\S]*)"(?:\.\s*Use a [\s\S]*tone[\s\S]*)?$/i, '$1').trim();
    cleaned = cleaned.replace(/^Write a (?:viral,\s*)?high-converting \w+ post about ([\s\S]*)$/i, '$1').trim();
    cleaned = cleaned.replace(/^Create a (?:high-converting|viral) \w+ post focusing on: "([\s\S]*)"(?:\.\s*Tone: [\s\S]*)?$/i, '$1').trim();
    cleaned = cleaned.replace(/^Adapt this core message for \w+: "([\s\S]*)"$/i, '$1').trim();
    if (cleaned.startsWith('"') && cleaned.endsWith('"') && cleaned.length > 2) {
      cleaned = cleaned.slice(1, -1).trim();
    }
  } while (cleaned !== prev && cleaned.length > 0);

  return cleaned;
}

/**
 * Helper to mask and unmask dynamic placeholders (e.g. {{PRODUCT_LINK}}, {brand_name}) during AI enhancement
 */
function maskPlaceholders(text) {
  if (!text) return { maskedText: '', placeholders: [] };
  const placeholders = [];
  const maskedText = text.replace(/\{\{[\w\-_:]+\}\}|\{[\w\-_:]+\}/g, (match) => {
    const token = `__PLACEHOLDER_${placeholders.length}__`;
    placeholders.push({ token, original: match });
    return token;
  });
  return { maskedText, placeholders };
}

function unmaskPlaceholders(text, placeholders) {
  if (!text || !placeholders || !placeholders.length) return text;
  let result = text;
  placeholders.forEach(({ token, original }) => {
    result = result.split(token).join(original);
  });
  return result;
}

/**
 * Magic Prompt Enhancer & Angles Generator:
 * Expands rough topic into high-converting prompt and provides 3 tailored actionable angles.
 */
export async function enhancePrompt({ rawThought, platform = 'GENERAL', tone = 'ENGAGING' }) {
  if (!rawThought || !rawThought.trim()) {
    throw new Error('A rough thought or topic is required to enhance prompt.');
  }

  const cleanThought = extractCoreThought(rawThought);
  const { maskedText, placeholders } = maskPlaceholders(cleanThought);
  const openai = getOpenAIClient();

  const generateFallbackAngles = (topic) => {
    const isSpiritual = /shiva|mahadev|om|namah|mantra|krishna|ram|bhagavad|gita|buddha|zen|spiritual|prayer|devot|peace|meditat|mindful|gratitude|soul|karma|temple|universe|god|blessing|divine|sacred/i.test(topic);
    if (isSpiritual) {
      return [
        {
          id: 'devotional_reflection',
          badge: '🕉️ Spiritual Reflection',
          title: 'Inner Peace & Grounding',
          prompt: `A heartfelt devotional reflection on "${topic}". Focus on inner stillness, meditation, resilience, and finding peace amid daily chaos.`,
        },
        {
          id: 'mindful_wisdom',
          badge: '🧘 Mindfulness & Stillness',
          title: 'Living Mindfully',
          prompt: `Practical spiritual wisdom inspired by "${topic}": 3 lessons on breath, surrender, and mental clarity for everyday life.`,
        },
        {
          id: 'sacred_meaning',
          badge: '✨ Sacred Meaning & Chant',
          title: 'Significance & Resonance',
          prompt: `The profound meaning and vibrational power of "${topic}". Uplifting, inspiring, and connecting followers to universal peace.`,
        },
      ];
    }
    const isMotivational = /motivation|habit|discipline|mindset|fitness|workout|health|resilience|growth mindset|daily routine|morning routine/i.test(topic);
    if (isMotivational) {
      return [
        {
          id: 'habit_shift',
          badge: '⚡ Transformational Habit',
          title: 'Daily Discipline',
          prompt: `Share a powerful mindset shift about "${topic}", the common trap people fall into, and 3 actionable habits to overcome it.`,
        },
        {
          id: 'contrarian_mindset',
          badge: '🔥 Reality Check',
          title: 'Debunking Quick Fixes',
          prompt: `A raw reality check on "${topic}": Why motivation is temporary but discipline and daily routines build true resilience.`,
        },
        {
          id: 'actionable_guide',
          badge: '📊 Practical Framework',
          title: 'Step-by-Step Blueprint',
          prompt: `A 3-step actionable guide to master "${topic}" in your daily routine with practical examples.`,
        },
      ];
    }
    return [
      {
        id: 'founder_story',
        badge: '👨‍💻 Founder & Tech Story',
        title: 'Personal Lesson & Experience',
        prompt: `Share a real engineering/product challenge we experienced regarding "${topic}", the mistake we made initially, and the exact lesson we learned in first-person voice ('I / We') with clean line breaks and key numbers.`,
      },
      {
        id: 'contrarian',
        badge: '🔥 Contrarian Opinion',
        title: 'Debunking Outdated Advice',
        prompt: `Unpopular opinion on "${topic}": Explain why conventional approaches are failing in 2026 and detail the 3-step modern framework that actually works.`,
      },
      {
        id: 'step_by_step',
        badge: '📊 Practical Step-by-Step Guide',
        title: 'Actionable Framework',
        prompt: `A high-impact 3-step breakdown of how to solve key challenges in "${topic}". Detail the friction, practical implementation steps, and the key moral/takeaway.`,
      },
    ];
  };

  if (!openai) {
    const mockOutput = `Create engaging, high-impact ${platform} posts about "${cleanThought}". Use a ${tone.toLowerCase()} tone in first-person voice. Start with a compelling scroll-stopping hook, detail actionable insights with clean spacing, and end with an engaging discussion prompt.`;
    return {
      success: true,
      originalThought: cleanThought,
      enhancedPrompt: unmaskPlaceholders(mockOutput, placeholders),
      angles: generateFallbackAngles(cleanThought),
      isMock: true,
      mockReason: 'OpenAI API key missing or invalid format',
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content: `You are an expert Social Media Copywriting & Viral Growth Strategist.
Your task is to take a user's rough topic for ${platform} (${tone} tone) and return a JSON object with:
1. "enhancedPrompt": A polished, high-converting social media prompt instructing the AI to write in authentic voice with a scroll-stopping hook, clean line breaks, and an engaging closing discussion question. If the topic is spiritual/devotional, craft an authentic spiritual reflection prompt—NEVER frame it as a tech company or startup.
2. "angles": Exactly 3 tailored, actionable prompt angle variations specifically for this topic's domain (e.g. if spiritual: Devotional Reflection, Mindfulness Wisdom, Sacred Meaning; if business/startup: Founder Story, Contrarian Take, Actionable Framework; if personal growth: Habit Shift, Reality Check, Step-by-step Guide).

CRITICAL: Preserve all __PLACEHOLDER_X__ tokens EXACTLY as they are.

Return ONLY valid JSON matching this schema:
{
  "enhancedPrompt": "...",
  "angles": [
    { "id": "angle_1", "badge": "...", "title": "...", "prompt": "..." },
    { "id": "angle_2", "badge": "...", "title": "...", "prompt": "..." },
    { "id": "angle_3", "badge": "...", "title": "...", "prompt": "..." }
  ]
}`,
        },
        {
          role: 'user',
          content: `Topic: "${maskedText}"`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
      max_tokens: 650,
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
    const enhanced = unmaskPlaceholders(parsed.enhancedPrompt || maskedText, placeholders);
    const angles = (parsed.angles && parsed.angles.length > 0 ? parsed.angles : generateFallbackAngles(cleanThought)).map((a) => ({
      ...a,
      prompt: unmaskPlaceholders(a.prompt, placeholders),
    }));

    return {
      success: true,
      originalThought: cleanThought,
      enhancedPrompt: enhanced,
      angles,
      isMock: false,
    };
  } catch (err) {
    logger.warn(`[AIService] Enhance prompt OpenAI fallback: ${err.message}`);
    const fallbackOutput = `Create engaging, high-impact ${platform} posts about "${cleanThought}". Start with a scroll-stopping hook and provide actionable takeaways with clean line breaks.`;
    return {
      success: true,
      originalThought: cleanThought,
      enhancedPrompt: unmaskPlaceholders(fallbackOutput, placeholders),
      angles: generateFallbackAngles(cleanThought),
      isMock: true,
      mockReason: err.message,
    };
  }
}

/**
 * AI Smart Contextual First Comment Generator.
 * Reads the post content/topic and generates a relevant first comment (key takeaway, discussion question, or product link CTA).
 */
export async function generateSmartFirstComment({ postContent, topic = '', platform = 'LINKEDIN' }) {
  const cleanTopic = extractCoreThought(topic || postContent || 'Innovation');
  const openai = getOpenAIClient();

  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: config.openai.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an elite social media growth manager writing a high-impact, attractive first comment for your own post. Include 2-3 engaging emojis (e.g. ✨, 📌, 🚀, 💬, 👇, 💡, 🙏, 🕉️). If the post is spiritual or devotional, express heartfelt peace, blessings, and reverence. If business/case study, ask a thought-provoking takeaway question. Keep it under 2 lines.'
          },
          {
            role: 'user',
            content: `Post Topic/Content: "${cleanTopic.substring(0, 300)}"\nPlatform: ${platform}`
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      const text = response.choices[0]?.message?.content?.trim();
      if (text) {
        return convertMarkdownToUnicode(text);
      }
    } catch (err) {
      logger.warn(`[AIService] generateSmartFirstComment OpenAI warning: ${err.message}`);
    }
  }

  // Fast Rule-Based Fallback
  const isSpiritual = /shiva|mahadev|om|namah|mantra|krishna|ram|bhagavad|gita|buddha|zen|spiritual|prayer|devot|peace|meditat|mindful|gratitude|soul|karma|temple|universe|god|blessing|divine|sacred/i.test(cleanTopic);
  if (isSpiritual) {
    return `🙏 Har Har Mahadev! May this sacred chant bring inner peace, stillness, and unwavering strength into your day. Har Har Mahadev! ✨🧘‍♂️\n\n#OmNamahShivaya #InnerPeace #Mindfulness`;
  }
  const isFestival = /diwali|holi|eid|christmas|new year|festiv|celebrat|happy|wishes|congratulat/i.test(cleanTopic);
  if (isFestival) {
    return `✨ Wishing everyone peace, prosperity, and joy on this special occasion! How are you celebrating today? 🎉\n\n#FestiveVibes #Celebration #Gratitude`;
  }
  const isMotivational = /motivation|habit|discipline|mindset|fitness|workout|health|resilience|growth mindset|daily routine|morning routine/i.test(cleanTopic);
  if (isMotivational) {
    return `💪 Which daily habit or mindset shift has had the biggest impact on your routine? Share below! 👇\n\n#Motivation #GrowthMindset #DailyDiscipline`;
  }
  const isCaseStudy = /product|startup|loom|skyscanner|aircall|clickup|acquisition|tool|saas/i.test(cleanTopic);
  if (isCaseStudy) {
    return `📌 What's your biggest takeaway from this breakdown? Drop your thoughts or questions below! 👇\n\n#Growth #Tech #ProductStrategy`;
  }
  return `💬 What's your perspective on this? I'd love to hear how your team handles this! 👇\n\n#Innovation #Strategy`;
}
