import OpenAI from 'openai';
import config from '../config/env.js';
import logger from '../utils/logger.js';
import { convertMarkdownToUnicode } from '../utils/textFormatter.js';
import { fetchArticleContext } from './ai/articleFetcher.js';

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

/**
 * Build the user message for article-repurposing runs.
 */
function buildArticleUserPrompt({ articleUrl, article, inputTopic, tone, platform }) {
  const instructions = inputTopic || 'Summarize the key takeaways for social media.';

  if (article?.text) {
    return [
      `Source article URL: ${article.finalUrl || articleUrl}`,
      article.title ? `Source article title: ${article.title}` : '',
      '',
      'Source article text (verbatim extract):',
      '"""',
      article.text,
      '"""',
      article.truncated ? '(The extract above was truncated; work only with what is present.)' : '',
      '',
      `Repurpose the source article above into a ready-to-publish ${platform} post.`,
      'CRITICAL: Use ONLY facts, names, numbers, and claims that appear in the extract. Do not invent statistics, quotes, or details that are not present.',
      `Include the source link ${article.finalUrl || articleUrl} in the post where it reads naturally.`,
      `Additional instructions: "${instructions}"`,
      `Tone: ${tone}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    `An article URL was supplied (${articleUrl}) but its contents could NOT be retrieved${article?.error ? ` (${article.error})` : ''}.`,
    'CRITICAL: Do NOT guess, summarize, or invent what that article says. Do not reference its contents at all.',
    `Write the ${platform} post using only the instructions below, and mention the link as further reading.`,
    `Instructions: "${instructions}"`,
    `Tone: ${tone}`,
  ].join('\n');
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

const SYSTEM_PROMPTS = {
  INSTAGRAM: `You are an expert Instagram Content Creator & Copywriter. 
Create an engaging Instagram caption that includes:
- A strong attention-grabbing hook in the first 2 lines
- Value-packed body text formatted with emojis and clean line breaks
- Clear Call to Action (CTA) encouraging comments, saves, or bio clicks
- 8-15 relevant hashtags separated by a space at the end.`,

  LINKEDIN: `You are an expert B2B Thought Leader and LinkedIn Copywriter.
Create a high-performing LinkedIn post that includes:
- A compelling hook (question or bold claim)
- Well-structured paragraph breaks for mobile readability
- Actionable takeaways or strategic insights
- Professional yet authentic tone
- 3-5 hyper-relevant industry hashtags.`,

  X: `You are a viral X (Twitter) Copywriter.
Create concise, high-impact content:
- For single tweets: keep under 270 characters, punchy, clear hook, minimal hashtags (0-2 max).
- If topic requires deep explanation, format as a numbered Twitter Thread (e.g. 1/, 2/, 3/).`,

  FACEBOOK: `You are an expert Facebook Page Copywriter & Social Media Strategist.
Create an engaging Facebook post that includes:
- A strong engaging hook in the first sentence
- Conversational, community-oriented story or value drop
- Clean formatting with line breaks for readability
- Open question or CTA encouraging comments and page likes
- 3-5 relevant hashtags at the end.`,
  
  GENERAL: `You are a master Social Media Content Strategist. Adapt content perfectly for social media audience engagement.`
};

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

  // Fetch the article itself when the caller has not already resolved it, so the
  // model works from the real text instead of guessing from the URL slug.
  let resolvedArticle = articleContext || null;
  if (articleUrl && !resolvedArticle) {
    resolvedArticle = await resolveArticleContext(articleUrl);
  }

  const model = config.openai.model;

  // Prefer the real article title over the raw URL as the template/mock topic.
  const fallbackTopic = inputTopic || resolvedArticle?.title || articleUrl;

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
        systemPrompt = `You are a viral X (Twitter) Premium Copywriter. The target X account is an X Premium / Twitter Blue subscriber, so long-form tweets up to 25,000 characters are fully allowed! Generate a detailed, engaging long-form article or post for X with rich insights and clean line breaks.`;
      } else {
        systemPrompt = `You are a viral X (Twitter) Copywriter. The target X account is a standard non-Premium account. Strictly keep single tweets under 270 characters, punchy, clear hook, minimal hashtags (0-2 max).`;
      }
    }
    
    if (brandContext) {
      systemPrompt += `\n\n[USER BRAND VOICE & CONTEXT]\n${brandContext}`;
    }
    if (contentSummary) {
      systemPrompt += `\n\n[USER CONTENT MEMORY & CONSTRAINTS]\n${contentSummary}\n\nCRITICAL INSTRUCTION: Do NOT duplicate concepts, hooks, phrasing, or core angles`;
    }

    let formattingInstructions = `\n\nFormatting Controls:
- Emoji Density: ${emojiDensity} (NONE = 0 emojis, LOW = 1-2 subtle emojis, MEDIUM = 3-5 emojis, HIGH = vibrant emoji layout)
- Hashtag Strategy: ${hashtagCount} (NONE = 0 hashtags, MODERATE = 3-5 targeted hashtags, HEAVY = 8-12 niche hashtags)
- Output Format Style: ${formatStyle} (SINGLE = standard single post, THREAD = numbered 1/ 2/ 3/ thread breakdown, CAROUSEL = structured slide-by-slide outline)
- Character Length Target: ${contentLength} (CONCISE = ~100-250 characters, BALANCED = ~250-600 characters, DETAILED = ~600-1500 characters)`;

    systemPrompt += formattingInstructions;

    const userPrompt = articleUrl
      ? buildArticleUserPrompt({ articleUrl, article: resolvedArticle, inputTopic, tone, platform })
      : `Topic/Prompt: "${inputTopic}"\nTone of voice: ${tone}\nTarget Platform: ${platform}.\nPlease generate the ready-to-publish post content.`;

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
      prompt: content ? `Adapt this core message for ${platform}: "${content}"` : '',
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
    ...(articleUrl && { sourceUrl: resolvedArticle?.finalUrl || articleUrl }),
    ...(resolvedArticle?.error && { articleWarning: resolvedArticle.error }),
  };
}

/**
 * Fallback AI Generator when OpenAI key is missing or encounters errors.
 */
function generateMockPostContent({ prompt, platform, tone, emojiDensity, hashtagCount, formatStyle, model, errorNotice }) {
  let content = '';
  const uppercasePlatform = (platform || 'GENERAL').toUpperCase();
  const cleanPrompt = prompt || 'Scaling workflow productivity with intelligent automation';

  let emojiHeader = emojiDensity === 'NONE' ? '' : emojiDensity === 'HIGH' ? '🚀🔥✨ ' : '💡 ';
  let hashtags = '';
  if (hashtagCount === 'MODERATE') {
    hashtags = '\n\n#Growth #AI #Productivity #Workflow';
  } else if (hashtagCount === 'HEAVY') {
    hashtags = '\n\n#Growth #AI #Productivity #Workflow #TechTrends #Automation #SocialMedia #Strategy #DigitalTransformation';
  }

  switch (uppercasePlatform) {
    case 'INSTAGRAM':
      if (formatStyle === 'THREAD') {
        content = `${emojiHeader}INSTAGRAM CAROUSEL THREAD: ${cleanPrompt}\n\nSlide 1: ${cleanPrompt}\nSlide 2: 💡 Key Insight #1: Execution beats strategy every time.\nSlide 3: ⚡ Key Insight #2: Automate repetitive workflows.\nSlide 4: 🎯 Key Insight #3: Scale your audience consistently.\n\n👇 Save this post for later!${hashtags}`;
      } else if (formatStyle === 'CAROUSEL') {
        content = `📸 [INSTAGRAM CAROUSEL OUTLINE]\nSLIDE 1: ${cleanPrompt}\nSLIDE 2: Why most creators get stuck\nSLIDE 3: The 3-step automation system\nSLIDE 4: Tap the link in bio to get started!${hashtags}`;
      } else {
        content = `${emojiHeader}${cleanPrompt}\n\nHere is something game-changing you need to know today!\n\nKey Insights:\n1. Execution > Ideas\n2. Consistency drives results\n3. Automation frees your time\n\n👇 Drop a comment below if you agree!${hashtags}`;
      }
      break;

    case 'LINKEDIN':
      if (formatStyle === 'THREAD') {
        content = `${emojiHeader}5 Lessons on ${cleanPrompt}:\n\n1. Stop spending hours manually drafting posts.\n2. Decouple content creation into reusable AI templates.\n3. Schedule recurring dispatches to stay top-of-mind.\n4. Measure engagement and double down on top performers.\n\nAgree? Share your thoughts below.${hashtags}`;
      } else if (formatStyle === 'CAROUSEL') {
        content = `📄 LINKEDIN DOCUMENT / CAROUSEL\n\nPage 1: ${cleanPrompt}\nPage 2: The Core Challenge\nPage 3: Strategic Solution\nPage 4: Implementation Framework\n\nRepost ♻️ if you found this insightful!${hashtags}`;
      } else {
        content = `${emojiHeader}How to master ${cleanPrompt} in 2026\n\nMany professionals struggle with scaling their reach online. The secret isn't spending more hours—it's building smarter workflows.\n\n3 key takeaways:\n• Systemize content creation with AI\n• Schedule posts ahead of time\n• Focus on high-signal conversations\n\nWhat strategies are working best for your workflow? Let's discuss in the comments.${hashtags}`;
      }
      break;

    case 'X':
    case 'TWITTER':
      if (formatStyle === 'THREAD') {
        content = `🧵 ${cleanPrompt}\n\n1/ Stop spending hours manually drafting posts.\n\n2/ Decouple content creation into reusable AI templates.\n\n3/ Schedule recurring dispatches to stay top-of-mind.\n\n4/ Measure engagement and double down on top performers.${hashtags}`;
      } else {
        content = `${emojiHeader}${cleanPrompt}\n\n1. Stop overthinking content strategy.\n2. Build repeatable systems.\n3. Leverage AI & automation to stay consistent.\n\nSimplicity scales.`;
      }
      break;

    case 'FACEBOOK':
      if (formatStyle === 'THREAD' || formatStyle === 'CAROUSEL') {
        content = `${emojiHeader}Community Guide: ${cleanPrompt}\n\nHere is a quick breakdown for our Facebook Community:\n\n1. Focus on engagement\n2. Share value daily\n3. Build authentic connections\n\nLike and share this post with someone who needs to see this!${hashtags}`;
      } else {
        content = `${emojiHeader}Hey Facebook Community! 👋\n\nLet's talk about ${cleanPrompt}.\n\nBuilding a strong online presence shouldn't consume your entire day. With smart scheduling and AI assistance, you can keep your page active and engaging 24/7.\n\nWhat are your biggest growth goals this month? Comment below!${hashtags}`;
      }
      break;

    default:
      content = `${emojiHeader}${cleanPrompt}\n\nAutomate your social growth with smart scheduling and AI-driven content tailored for your audience!${hashtags}`;
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
  
  // Strip outer quotes and common template prefixes
  cleaned = cleaned.replace(/^(?:💡\s*How to master\s*)?(?:Adapt this core message for [^:]+:\s*)?/gi, '');

  let prev;
  do {
    prev = cleaned;
    // Unwrap nested 'Write a viral, high-converting ... post about "... "'
    cleaned = cleaned.replace(/^Write a (?:viral,\s*)?high-converting \w+ post about "([\s\S]*)"(?:\.\s*Use a [\s\S]*tone[\s\S]*)?$/i, '$1').trim();
    cleaned = cleaned.replace(/^Write a (?:viral,\s*)?high-converting \w+ post about ([\s\S]*)$/i, '$1').trim();
    // Unwrap quotes surrounding whole string
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

  // Helper to format mock response cleanly without recursive nesting
  const formatMockPrompt = (thought) => {
    const isDetailed = thought.split(/\s+/).length > 12;
    if (isDetailed) {
      return `Create a high-converting ${platform} post focusing on: ${thought}. Tone: ${tone.toLowerCase()}. Include a compelling hook, 3 key takeaways, clean formatting with emojis, and an engaging question at the end.`;
    }
    return `Write a viral, high-converting ${platform} post about "${thought}". Use a ${tone.toLowerCase()} tone. Start with a powerful hook in the first line, explain 3 key actionable takeaways, use clean formatting with emojis, and conclude with an engaging Call-to-Action question.`;
  };

  if (!openai) {
    return {
      success: true,
      originalThought: cleanThought,
      enhancedPrompt: formatMockPrompt(cleanThought),
      isMock: true,
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content: `You are an expert AI Prompt Engineer for Social Media Content Creators. Your job is to take a raw, short, or rough thought from a user and expand it into a detailed, high-converting, structured prompt that will generate an extraordinary ${platform} post in a ${tone} tone. Keep the output prompt concise, clear, and actionable (2-4 sentences max). Output ONLY the enhanced prompt string without meta-commentary, quotation marks, or recursive nested wrappers.`,
        },
        {
          role: 'user',
          content: `Raw Thought: "${cleanThought}"`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
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
    };
  }
}
