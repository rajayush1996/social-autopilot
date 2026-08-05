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
 * STAGE 1: Deep Intent, Sentiment & Metadata Analyzer.
 * Deconstructs raw user prompts into rich structured intent JSON:
 * - Intent & Content Category
 * - Target Audience & Resonant Emotion
 * - Core Customer Friction & Problem
 * - Key Entities (Brands, Companies, Metrics)
 * - Optimal Post Format & Viral Hook Angle
 */
export async function analyzePromptIntent({ prompt, platform = 'LINKEDIN', tone = 'ENGAGING' }) {
  const clean = extractCoreThought(prompt);
  const openai = getOpenAIClient();

  // Local Deterministic Syntactic AST Check (0 Tokens, ~1ms)
  const isChoicePattern = /(?:for example|such as|like|e\.g\.|or)\s+/i.test(clean);

  if (!openai) {
    const isCaseStudy = /product|startup|loom|skyscanner|acquisition|acquire|business|case study|problem|train/i.test(clean);
    return {
      primaryIntent: isCaseStudy ? 'PRODUCT_CASE_STUDY' : 'BUSINESS_INSIGHT',
      targetAudience: isCaseStudy ? 'Founders, Product Managers & Tech Innovators' : 'Professionals & Creators',
      emotionalTone: tone.toLowerCase(),
      coreProblem: isCaseStudy ? 'Eliminating real-world customer friction' : 'Optimizing growth & productivity',
      entities: isCaseStudy ? ['Loom', 'Skyscanner', 'Where is my Train'] : [],
      primarySubject: isCaseStudy ? 'Loom' : 'Productivity',
      executionStrategy: 'SINGLE_SUBJECT_FOCUS',
      postType: isCaseStudy ? 'STORY_CASE_STUDY' : 'STRATEGIC_TAKEAWAY',
      viralHookAngle: isCaseStudy ? 'Bold claim about landmark product solving hidden friction' : 'High-impact industry perspective',
      cleanPrompt: clean,
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content: `You are an expert Social Media AI Intent & Sentiment Analyst. Analyze the raw prompt and extract structured JSON metadata.
Output ONLY raw JSON with these exact keys:
{
  "primaryIntent": "PRODUCT_CASE_STUDY" | "FOUNDER_STORY" | "POETRY_SHAYARI" | "SPORTS_ANALYSIS" | "FITNESS_HEALTH" | "HOW_TO_GUIDE" | "BUSINESS_INSIGHT",
  "targetAudience": "string describing target audience",
  "emotionalTone": "string describing emotional tone",
  "coreProblem": "string summarizing core friction/topic",
  "entities": ["array of company/product/concept names"],
  "primarySubject": "the single hero entity or subject to focus on",
  "executionStrategy": "SINGLE_SUBJECT_FOCUS",
  "postType": "STORY_CASE_STUDY" | "ACTIONABLE_LIST" | "POETIC_REFLECTIVE" | "PROBLEM_SOLUTION",
  "viralHookAngle": "compelling 1-line hook angle for ${platform}",
  "cleanPrompt": "cleaned topic string"
}`,
        },
        {
          role: 'user',
          content: `Raw Prompt: "${clean}"`,
        },
      ],
      temperature: 0.2,
      max_tokens: 300,
    });

    const rawJson = response.choices[0]?.message?.content?.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(rawJson);
    return {
      ...parsed,
      executionStrategy: 'SINGLE_SUBJECT_FOCUS',
      primarySubject: parsed.primarySubject || parsed.entities?.[0] || 'the main topic',
      cleanPrompt: clean,
    };
  } catch (err) {
    logger.warn(`[AIService] Intent analysis fallback: ${err.message}`);
    const isCaseStudy = /product|startup|loom|skyscanner|acquisition|acquire|business|case study|problem/i.test(clean);
    return {
      primaryIntent: isCaseStudy ? 'PRODUCT_CASE_STUDY' : 'BUSINESS_INSIGHT',
      targetAudience: 'Founders & Product Creators',
      emotionalTone: tone.toLowerCase(),
      coreProblem: 'Solving real customer friction',
      entities: [],
      primarySubject: 'the main topic',
      executionStrategy: 'SINGLE_SUBJECT_FOCUS',
      postType: isCaseStudy ? 'STORY_CASE_STUDY' : 'ACTIONABLE_LIST',
      viralHookAngle: 'High impact problem-solution hook',
      cleanPrompt: clean,
    };
  }
}

/**
 * Generate post content using OpenAI GPT models with fallback mock generation.
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

  const model = config.openai.model;

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
    let systemPrompt = SYSTEM_PROMPTS[platform.toUpperCase()] || SYSTEM_PROMPTS.GENERAL;

    if (platform.toUpperCase() === 'X') {
      if (isXPremium) {
        systemPrompt = `You are a viral X (Twitter) Premium Copywriter. The target X account is an X Premium subscriber, long-form posts allowed.`;
      } else {
        systemPrompt = `You are a viral X (Twitter) Copywriter. Strictly keep single tweets under 270 characters, punchy, clear hook.`;
      }
    }
    
    if (brandContext) {
      systemPrompt += `\n\n[USER BRAND VOICE & CONTEXT]\n${brandContext}`;
    }
    if (contentSummary) {
      systemPrompt += `\n\n[USER CONTENT MEMORY & CONSTRAINTS]\n${contentSummary}\n\nCRITICAL INSTRUCTION: Do NOT duplicate concepts, hooks, phrasing, or core angles`;
    }

    systemPrompt += buildFormattingInstructions({ emojiDensity, hashtagCount, formatStyle, contentLength, tone });

    // STAGE 1: Execute Chain-of-Thought Intent Analysis
    const intentMeta = await analyzePromptIntent({ prompt: cleanTopic, platform, tone });

    const userPrompt = articleUrl
      ? buildArticleUserPrompt({ articleUrl, article: resolvedArticle, inputTopic: cleanTopic, tone, platform })
      : `[AI DEEP INTENT & CHAIN-OF-THOUGHT EXECUTION]
- Primary Intent: ${intentMeta.primaryIntent}
- Target Audience: ${intentMeta.targetAudience}
- Emotional Tone: ${intentMeta.emotionalTone}
- Customer Problem / Friction: ${intentMeta.coreProblem}
- Primary Hero Subject: ${intentMeta.primarySubject}
- Execution Strategy: ${intentMeta.executionStrategy}
- Recommended Viral Hook Angle: ${intentMeta.viralHookAngle}

[USER CORE INSTRUCTION & TOPIC]
"${intentMeta.cleanPrompt}"

CRITICAL SINGLE-SUBJECT SYNTHESIS INSTRUCTIONS:
1. Write an authentic, compelling ${platform} post that directly addresses the Target Audience in a ${tone} tone.
2. Focus 100% of the narrative, hook, body, takeaways, and moral on EXACTLY ONE primary subject (${intentMeta.primarySubject}). Do NOT list or combine multiple products or topics in the opening line or body copy.
3. HOOK MANDATE: NEVER start with "Discover how...", "In today's fast-paced world...", or generic corporate fluff. Line 1 MUST be a dramatic, scroll-stopping metric or acquisition event (e.g. "When Atlassian acquired a simple 2-minute video tool for $975 Million, the tech world paid attention...").
4. REAL-WORLD DEAL FACTS: Include the specific acquisition or valuation details (such as acquisition by Atlassian, Google, etc.) whenever mentioned in the prompt context to make the teardown authentic and fascinating.
5. If primaryIntent is PRODUCT_CASE_STUDY or STORY_CASE_STUDY: tell an authentic story about ${intentMeta.primarySubject}, explain the customer friction solved, explain why it succeeded, list 3 actionable takeaways with Unicode Bold headers, and end with the moral of the story.
6. EMOJI DENSITY MANDATE: Strictly follow user choice (${emojiDensity}): ${
  emojiDensity === 'NONE'
    ? 'Do NOT include any emojis anywhere in the text (0 emojis).'
    : emojiDensity === 'LOW'
    ? 'Include 1 to 2 subtle emojis placed at section headers (e.g. 🎯 Moral of the story, 💡 CTA question).'
    : emojiDensity === 'HIGH'
    ? 'Include vibrant emojis next to every section, takeaway, and bullet point.'
    : 'Include 3 to 5 relevant emojis next to key takeaways, moral of the story, and CTA question (e.g. 📌 3 Takeaways, 🎯 Moral, 💡 CTA).'
} Do NOT return 0 emojis when ${emojiDensity} is selected.
7. HASHTAG MANDATE: Follow user choice (${hashtagCount}): ${
  hashtagCount === 'NONE'
    ? 'Do NOT include any hashtags.'
    : hashtagCount === 'HEAVY'
    ? 'Include 8 to 12 niche industry hashtags at the end.'
    : 'Include 3 to 5 targeted hashtags at the end.'
}
8. Output ONLY the ready-to-publish post content without meta-commentary, quotation marks, or prompt headers.`;

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1200,
    });

    const generatedText = completion.choices[0]?.message?.content?.trim() || '';
    const formattedContent = convertMarkdownToUnicode(generatedText);

    return {
      success: true,
      content: formattedContent,
      platform,
      tone,
      modelUsed: model,
      tokensUsed: completion.usage?.total_tokens || 0,
      isMock: false,
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
    });
    results[platform.toUpperCase()] = result.content;
  }

  return {
    success: true,
    originalContent: content,
    adaptedPosts: results,
  };
}

/**
 * Fallback AI Generator when OpenAI key is missing or encounters errors.
 */
function generateMockPostContent({ prompt, platform, tone, emojiDensity, hashtagCount, formatStyle, model, errorNotice }) {
  let content = '';
  const uppercasePlatform = (platform || 'GENERAL').toUpperCase();
  const rawPrompt = prompt || 'Scaling workflow productivity with intelligent automation';
  const cleanPrompt = extractCoreThought(rawPrompt);

  let emojiHeader = emojiDensity === 'NONE' ? '' : emojiDensity === 'HIGH' ? '🚀🔥✨ ' : '💡 ';
  let hashtags = '';
  if (hashtagCount === 'MODERATE') {
    hashtags = '\n\n#StartupStory #ProductStrategy #Innovation #BusinessGrowth';
  } else if (hashtagCount === 'HEAVY') {
    hashtags = '\n\n#StartupStory #ProductStrategy #Innovation #BusinessGrowth #TechTrends #Entrepreneurship #SaaS #ProductManagement';
  }

  const isCaseStudy = /product|startup|loom|skyscanner|acquisition|acquire|business|case study|problem|train/i.test(cleanPrompt);

  // Rotate case study based on timestamp day/hash so it changes every single day
  const caseIdx = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % MOCK_CASE_STUDIES.length;
  const study = MOCK_CASE_STUDIES[caseIdx];

  switch (uppercasePlatform) {
    case 'INSTAGRAM':
      if (formatStyle === 'THREAD') {
        content = `${emojiHeader}INSTAGRAM CAROUSEL THREAD: ${study.company}\n\n${study.headline}\n\nSlide 1: Problem: ${study.problem}\nSlide 2: Solution: ${study.story}\nSlide 3: Moral: ${study.moral}\n\n👇 Save this post for later!${hashtags}`;
      } else {
        content = `${emojiHeader}${study.headline}\n\nCase Study: ${study.company}\n\n${study.story}\n\nKey Takeaways:\n1. Problem: ${study.problem}\n2. Moral: ${study.moral}\n\n👇 Drop a comment below if you agree!${hashtags}`;
      }
      break;

    case 'LINKEDIN':
      if (isCaseStudy) {
        const bulletEmoji = emojiDensity === 'NONE' ? '•' : '📌';
        const moralEmoji = emojiDensity === 'NONE' ? '' : '🎯 ';
        const ctaEmoji = emojiDensity === 'NONE' ? '' : '💡 ';
        content = `${emojiHeader}${study.headline}\n\nCase Study spotlight on **${study.company}**:\n${study.story}\n\n3 Key Actionable Takeaways:\n${bulletEmoji} **Customer Friction First:** ${study.problem}\n${bulletEmoji} **Product-Led Scale:** Build solutions that fit seamlessly into daily routines.\n${bulletEmoji} **Moral of the Story:** ${study.moral}\n\n${moralEmoji}The moral of the story? Innovation arises from solving real customer pain points.\n\n${ctaEmoji}What is one product you rely on every single day? Share your thoughts in the comments below!${hashtags}`;
      } else {
        content = `${emojiHeader}${cleanPrompt}\n\nKey Actionable Insights:\n• Focus on validated customer problems.\n• Build intuitive, seamless workflows.\n• Scale engagement with high-signal content.\n\nWhat strategies are working best for your product? Let's discuss in the comments.${hashtags}`;
      }
      break;

    case 'X':
    case 'TWITTER':
      content = `🧵 Case Study: ${study.company}\n\n1/ ${study.headline}\n\n2/ Problem: ${study.problem}\n\n3/ Solution: ${study.story}\n\n4/ Moral: ${study.moral}`;
      break;

    case 'FACEBOOK':
      content = `${emojiHeader}Hey Community! 👋\n\n${study.headline}\n\n${study.story}\n\nMoral of the story: ${study.moral}\n\nWhat product saved your workflow this week? Comment below!${hashtags}`;
      break;

    default:
      content = `${emojiHeader}${study.headline}\n\n${study.story}\n\nMoral: ${study.moral}${hashtags}`;
      break;
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
 * Magic Prompt Enhancer: Expands a user's rough thought into an optimized, high-converting social media prompt.
 */
export async function enhancePrompt({ rawThought, platform = 'GENERAL', tone = 'ENGAGING' }) {
  if (!rawThought || !rawThought.trim()) {
    throw new Error('A rough thought or topic is required to enhance prompt.');
  }

  const cleanThought = extractCoreThought(rawThought);
  const openai = getOpenAIClient();

  // Helper to format mock response cleanly without recursive nesting or duplication
  const formatMockPrompt = (thought) => {
    let clean = (thought || '').replace(/\n*\[PROMPT DIRECTIVE\]:[\s\S]*/gi, '').trim();
    const isDetailed = clean.split(/\s+/).length > 10;
    const containsExamples = /(?:for example|such as|like|e\.g\.|or)\s+/i.test(clean);
    if (containsExamples) {
      return `${clean}\n\n[PROMPT DIRECTIVE]: Focus 100% on EXACTLY ONE primary subject from your examples. Tell a deep, authentic narrative without combining multiple items.`;
    }
    if (isDetailed) {
      return clean;
    }
    return `Write an engaging ${platform} post about "${clean}". Use a ${tone.toLowerCase()} tone. Start with a compelling scroll-stopping hook, detail key insights with clean line breaks, and end with an engaging audience question.`;
  };

  if (!openai) {
    return {
      success: true,
      originalThought: cleanThought,
      enhancedPrompt: formatMockPrompt(cleanThought),
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
          content: `You are an expert AI Prompt Optimizer. Your job is to refine a user's prompt for ${platform} in a ${tone} tone.
RULES:
1. Preserve 100% of the user's domain, theme, and intent (whether it is Shayari, Relationship advice, Sports analysis, Fitness tips, or Startup case studies).
2. If the user provided multiple examples (e.g. Loom or Skyscanner, Keto or Fasting), add an explicit instruction to focus on EXACTLY ONE primary subject per post.
3. If the user's prompt is already detailed and rich, keep it mostly intact, only sharpening the clarity.
4. Output ONLY the optimized prompt string without meta-commentary, headers like "Create a post focusing on:", or quotation marks.`,
        },
        {
          role: 'user',
          content: `Raw Prompt: "${cleanThought}"`,
        },
      ],
      temperature: 0.5,
      max_tokens: 250,
    });

    const enhancedText = extractCoreThought(response.choices[0]?.message?.content?.trim() || cleanThought);

    return {
      success: true,
      originalThought: cleanThought,
      enhancedPrompt: enhancedText || formatMockPrompt(cleanThought),
      isMock: false,
    };
  } catch (err) {
    logger.warn(`[AIService] Enhance prompt OpenAI fallback: ${err.message}`);
    return {
      success: true,
      originalThought: cleanThought,
      enhancedPrompt: formatMockPrompt(cleanThought),
      isMock: true,
      mockReason: err.message,
    };
  }
}
