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
export async function generatePostContent({ prompt, platform = 'GENERAL', tone = 'ENGAGING', topic }) {
  const openai = getOpenAIClient();
  const inputTopic = prompt || topic;

  if (!inputTopic) {
    throw new Error('A prompt or topic is required to generate AI content.');
  }

  const model = config.openai.model;

  if (!openai) {
    logger.warn('⚠️ OPENAI_API_KEY not configured. Using intelligent template generator.');
    return generateMockPostContent({ prompt: inputTopic, platform, tone, model: 'mock-template-engine' });
  }

  try {
    const systemPrompt = SYSTEM_PROMPTS[platform.toUpperCase()] || SYSTEM_PROMPTS.GENERAL;
    const userPrompt = `Topic/Prompt: "${inputTopic}"\nTone of voice: ${tone}\nTarget Platform: ${platform}.\nPlease generate the ready-to-publish post content.`;

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000,
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
    // Graceful fallback if API fails (e.g. quota, network error)
    return generateMockPostContent({
      prompt: inputTopic,
      platform,
      tone,
      model: `${model} (fallback)`,
      errorNotice: error.message
    });
  }
}

/**
 * Adapt a single master post content into optimized versions for Instagram, LinkedIn, and X.
 */
export async function optimizePostForPlatforms({ content, platforms = ['INSTAGRAM', 'LINKEDIN', 'X'], tone = 'PROFESSIONAL' }) {
  const results = {};
  
  for (const platform of platforms) {
    const result = await generatePostContent({
      prompt: `Adapt this core message for ${platform}: "${content}"`,
      platform: platform.toUpperCase(),
      tone
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
function generateMockPostContent({ prompt, platform, tone, model, errorNotice }) {
  let content = '';

  const uppercasePlatform = (platform || 'GENERAL').toUpperCase();

  switch (uppercasePlatform) {
    case 'INSTAGRAM':
      content = `✨ ${prompt}\n\nHere is something game-changing you need to know today! 🚀\n\n💡 Key Insights:\n1. Execution > Ideas\n2. Consistency drives results\n3. Automation frees your time\n\n👇 Drop a comment below if you agree!\n\n#SocialAutopilot #AI #ContentCreation #Marketing #Automation #Productivity`;
      break;
    case 'LINKEDIN':
      content = `Here is how to solve ${prompt} in 2026 💡\n\nMany professionals struggle with scaling their reach online. The secret isn't spending more hours—it's building smarter workflows.\n\n3 lessons learned:\n• Systemize content creation with AI\n• Schedule posts ahead of time\n• Focus on high-signal conversations\n\nWhat strategies are working best for your workflow? Let's discuss in the comments.\n\n#Innovation #Productivity #AI #SocialMedia #Growth`;
      break;
    case 'X':
      content = `🚀 ${prompt}\n\n1/ Stop overthinking your content strategy.\n2/ Build repeatable systems.\n3/ Leverage AI & automation to stay consistent.\n\nSimplicity scales.`;
      break;
    default:
      content = `🚀 ${prompt}\n\nAutomate your social growth with smart scheduling and AI-driven content tailored for your audience!`;
      break;
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
