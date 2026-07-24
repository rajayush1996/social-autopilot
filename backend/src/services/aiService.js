import OpenAI from 'openai';
import config from '../config/env.js';
import logger from '../utils/logger.js';

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = config.openai.apiKey;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
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
  articleUrl,
}) {
  const openai = getOpenAIClient();
  const inputTopic = prompt || topic;

  if (!inputTopic && !articleUrl) {
    throw new Error('A prompt, topic, or article URL is required to generate AI content.');
  }

  const model = config.openai.model;

  if (!openai) {
    logger.warn('⚠️ OPENAI_API_KEY not configured. Using intelligent template generator.');
    return generateMockPostContent({ 
      prompt: inputTopic || articleUrl, 
      platform, 
      tone, 
      emojiDensity, 
      hashtagCount,
      formatStyle,
      model: 'mock-template-engine' 
    });
  }

  try {
    let systemPrompt = SYSTEM_PROMPTS[platform.toUpperCase()] || SYSTEM_PROMPTS.GENERAL;
    
    if (brandContext) {
      systemPrompt += `\n\n[USER BRAND VOICE & CONTEXT]\n${brandContext}`;
    }
    if (contentSummary) {
      systemPrompt += `\n\n[USER CONTENT MEMORY & CONSTRAINTS]\n${contentSummary}\n\nCRITICAL INSTRUCTION: Do NOT duplicate concepts, hooks, phrasing, or core angles`;
    }

    let formattingInstructions = `\n\nFormatting Controls:
- Emoji Density: ${emojiDensity} (NONE = 0 emojis, LOW = 1-2 subtle emojis, MEDIUM = 3-5 emojis, HIGH = vibrant emoji layout)
- Hashtag Strategy: ${hashtagCount} (NONE = 0 hashtags, MODERATE = 3-5 targeted hashtags, HEAVY = 8-12 niche hashtags)
- Output Format Style: ${formatStyle} (SINGLE = standard single post, THREAD = numbered 1/ 2/ 3/ thread breakdown, CAROUSEL = structured slide-by-slide outline)`;

    systemPrompt += formattingInstructions;

    const userPrompt = articleUrl 
      ? `Article URL to Repurpose: "${articleUrl}"\nAdditional Instructions: "${inputTopic || 'Summarize key takeaways for social media.'}"\nTone: ${tone}\nTarget Platform: ${platform}`
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

    return {
      success: true,
      content: generatedText,
      platform,
      tone,
      modelUsed: model,
      tokensUsed: completion.usage?.total_tokens || 0,
      isMock: false
    };
  } catch (error) {
    logger.error(`❌ Error during OpenAI content generation: ${error.message}`);
    return generateMockPostContent({
      prompt: inputTopic || articleUrl,
      platform,
      tone,
      emojiDensity,
      hashtagCount,
      formatStyle,
      model: `${model} (fallback)`,
      errorNotice: error.message
    });
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
  articleUrl,
}) {
  const results = {};
  
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
      articleUrl,
    });
    results[platform.toUpperCase()] = result.content;
  }

  return {
    success: true,
    originalContent: content,
    adaptedPosts: results
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

  if (formatStyle === 'THREAD') {
    content = `🧵 ${cleanPrompt}\n\n1/ Stop spending hours manually drafting posts.\n\n2/ Decouple content creation into reusable AI templates.\n\n3/ Schedule recurring dispatches to stay top-of-mind.\n\n4/ Measure engagement and double down on top performers.${hashtags}`;
  } else if (formatStyle === 'CAROUSEL') {
    content = `📌 SLIDE 1: ${cleanPrompt}\n\n📌 SLIDE 2: Problem: Manual social media posting causes burnout.\n\n📌 SLIDE 3: Solution: Intelligent AI drafting + automated queueing.\n\n📌 SLIDE 4: Actionable Tip: Define 3 content pillars today.${hashtags}`;
  } else {
    switch (uppercasePlatform) {
      case 'INSTAGRAM':
        content = `${emojiHeader}${cleanPrompt}\n\nHere is something game-changing you need to know today!\n\nKey Insights:\n1. Execution > Ideas\n2. Consistency drives results\n3. Automation frees your time\n\n👇 Drop a comment below if you agree!${hashtags}`;
        break;
      case 'LINKEDIN':
        content = `${emojiHeader}How to master ${cleanPrompt} in 2026\n\nMany professionals struggle with scaling their reach online. The secret isn't spending more hours—it's building smarter workflows.\n\n3 key takeaways:\n• Systemize content creation with AI\n• Schedule posts ahead of time\n• Focus on high-signal conversations\n\nWhat strategies are working best for your workflow? Let's discuss in the comments.${hashtags}`;
        break;
      case 'X':
        content = `${emojiHeader}${cleanPrompt}\n\n1. Stop overthinking content strategy.\n2. Build repeatable systems.\n3. Leverage AI & automation to stay consistent.\n\nSimplicity scales.${hashtags}`;
        break;
      default:
        content = `${emojiHeader}${cleanPrompt}\n\nAutomate your social growth with smart scheduling and AI-driven content tailored for your audience!${hashtags}`;
        break;
    }
  }

  return {
    success: true,
    content,
    platform: uppercasePlatform,
    tone,
    modelUsed: model || 'mock-ai-engine',
    tokensUsed: 0,
    isMock: true,
    ...(errorNotice && { warning: `OpenAI API returned error: ${errorNotice}. Used fallback template.` })
  };
}
