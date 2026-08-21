import OpenAI from 'openai';
import config from '../config/env.js';
import logger from '../utils/logger.js';

// Common known products, startups, and tech brands for rapid matching
export const KNOWN_ENTITIES = [
  'Airmeet', 'Zoom', 'Loom', 'Notion', 'Skyscanner', 'Where is my Train', 'Where Is My Train',
  'Zapier', 'Canva', 'Figma', 'Stripe', 'Supabase', 'Linear', 'Airtable', 'Webflow',
  'Shopify', 'Calendly', 'Grammarly', 'GitHub', 'Miro', 'Postman', 'Brex', 'Ramp',
  'Retool', 'ElevenLabs', 'Runway', 'Midjourney', 'Perplexity', 'ClickUp', 'Discord',
  'Airbnb', 'Spotify', 'Uber', 'Netflix', 'Slack', 'Asana', 'Monday.com', 'Trello',
  'Coda', 'Raycast', 'Vercel', 'Netlify', 'PostHog', 'Segment', 'Intercom', 'HubSpot',
  'Buffer', 'Hootsuite', 'Klaviyo', 'Substack', 'Medium', 'LottieFiles', 'Typeform',
  'Duolingo', 'Coursera', 'Udemy', 'Headspace', 'Calm', 'Oura', 'Whoop', 'Strava',
  'Wise', 'Revolut', 'Robinhood', 'Plaid', 'Coinbase', 'Square', 'Toast', 'Deel',
  'Remote.com', 'Rippling', 'Gusto', 'Carta', 'AngelList', 'Product Hunt', 'Mealify', 'SonicSphere',
  'CRED', 'Swiggy', 'Zomato', 'Razorpay', 'Zepto', 'Blinkit', 'Zerodha', 'Paytm', 'Groww',
  'Cursor', 'Anthropic', 'Claude', 'Replit', 'v0', 'Resend', 'Clerk', 'Turso', 'Neon'
];

const getOpenAIClient = () => {
  if (process.env.NODE_ENV === 'test') return null;
  const apiKey = config.openai.apiKey;
  if (!apiKey || apiKey === 'your_openai_api_key_here' || apiKey.includes('placeholder') || apiKey.length < 25) {
    return null;
  }
  const clientConfig = { apiKey };
  if (config.openai.baseUrl) clientConfig.baseURL = config.openai.baseUrl;
  return new OpenAI(clientConfig);
};

/**
 * Extract hero brand or product name from post content using high-speed heuristics
 */
export function extractBrandFromContent(content) {
  if (!content || typeof content !== 'string') return null;

  const contentSlice = content.slice(0, 1200);

  // 1. Check known entities in content
  for (const entity of KNOWN_ENTITIES) {
    const regex = new RegExp(`\\b${entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(contentSlice)) {
      return entity;
    }
  }

  // 2. Pattern: "Enter [Brand]..." (e.g. "Enter Airmeet, a virtual event platform...")
  const enterMatch = contentSlice.match(/Enter\s+([A-Z][A-Za-z0-9_.-]+(?:\s+[A-Z][A-Za-z0-9_.-]+)?)/i);
  if (enterMatch && enterMatch[1] && !['The', 'Our', 'A', 'This', 'Here', 'Now'].includes(enterMatch[1])) {
    return enterMatch[1].trim();
  }

  // 3. Pattern: "Meet [Brand]..."
  const meetMatch = contentSlice.match(/Meet\s+(?:the\s+)?([A-Z][A-Za-z0-9_.-]+(?:\s+[A-Z][A-Za-z0-9_.-]+)?)/i);
  if (meetMatch && meetMatch[1] && !['The', 'Our', 'A', 'This'].includes(meetMatch[1])) {
    return meetMatch[1].trim();
  }

  // 4. Pattern: "How [Brand] scaled/built/revolutionized..."
  const howMatch = contentSlice.match(/How\s+([A-Z][A-Za-z0-9_.-]+(?:\s+[A-Z][A-Za-z0-9_.-]+)?)\s+(?:scaled|grew|built|disrupted|revolutionized|conquered|solved|redefined|generated)/i);
  if (howMatch && howMatch[1] && !['We', 'You', 'They', 'A', 'The'].includes(howMatch[1])) {
    return howMatch[1].trim();
  }

  // 5. Pattern: "When [Brand] was..." or "When [Brand] acquired..."
  const whenMatch = contentSlice.match(/When\s+([A-Z][A-Za-z0-9_.-]+(?:\s+[A-Z][A-Za-z0-9_.-]+)?)\s+(?:was|launched|acquired|revolutionized|disrupted|created|introduced|scaled)/i);
  if (whenMatch && whenMatch[1] && !['A', 'The', 'In', 'This', 'Every', 'Our'].includes(whenMatch[1])) {
    return whenMatch[1].trim();
  }

  // 6. Pattern: "[Brand], a/an [platform/tool/startup/app]..."
  const appMatch = contentSlice.match(/([A-Z][A-Za-z0-9_.-]+(?:\s+[A-Z][A-Za-z0-9_.-]+)?),\s+(?:a|an)\s+(?:virtual|platform|tool|app|software|startup|company|brand|product|service|solution|ai)/i);
  if (appMatch && appMatch[1] && !['However', 'Therefore', 'Moreover', 'Today', 'Recently', 'First', 'Next'].includes(appMatch[1])) {
    return appMatch[1].trim();
  }

  // 7. Pattern: Unicode bold brand name (e.g. 𝗡𝗼𝘁𝗶𝗼𝗻, 𝗦𝗼𝗻𝗶𝗰𝗦𝗽𝗵𝗲𝗿𝗲)
  const firstLine = content.split('\n')[0] || '';
  const boldMatch = firstLine.match(/[\uD835][\uDC00-\uDFFF]+/g);
  if (boldMatch && boldMatch.length > 0) {
    return 'UnicodeHighlightedBrand';
  }

  return null;
}

/**
 * AI-Powered Intent & Entity Extractor (Fast LLM pass with deterministic fallback)
 * Extracts: brandName, coreTopic, niche, visualPrompt for Image AI
 */
export async function extractBrandAndVisualIntentWithAI({ content, topic, tone = 'ENGAGING' }) {
  // 1. First run fast deterministic heuristic
  const heuristicBrand = extractBrandFromContent(content);
  const cleanTopic = topic || 'Product Growth & Technology Innovation';

  const isSpiritualOrDevotional = /shiv|durga|ganesh|krishna|ram|hanuman|god|deity|festival|diwali|navratri|shivratri|devotional|spiritual|bhakti|temple|puja|blessing/i.test(`${content} ${cleanTopic}`);

  const fallbackResult = {
    brandName: heuristicBrand || null,
    coreSubject: heuristicBrand || cleanTopic,
    niche: isSpiritualOrDevotional ? 'SPIRITUAL' : (heuristicBrand ? 'TECH_STARTUP' : 'BUSINESS_GROWTH'),
    visualPrompt: isSpiritualOrDevotional
      ? `Majestic 3D digital artwork illustration representing ${heuristicBrand || cleanTopic}, divine serene cosmic lighting, gold and deep indigo glowing aura, high-resolution artistic aesthetic, respectful cultural illustration, ultra-sharp 8k resolution, cinematic social media poster. Zero distorted text.`
      : `Minimalist 3D tech visual for ${heuristicBrand || cleanTopic}, featuring official company logo emblem and sleek modern product UI dashboard of ${heuristicBrand || cleanTopic}, deep indigo and electric cyan glowing neon accents, dark mode studio aesthetic, clean geometry, ultra-sharp 8k digital art, premium social media post banner visual. Zero distorted text.`
  };

  const openai = getOpenAIClient();
  if (!openai) {
    return fallbackResult;
  }

  try {
    const prompt = `Analyze this social media post content and extract key visual metadata as a strictly valid JSON object.
Post Content:
"""
${content ? content.slice(0, 1000) : cleanTopic}
"""

Return JSON format:
{
  "brandName": "Exact primary company/startup/brand/deity name featured in post, or null if none",
  "coreSubject": "Primary hero subject or problem solved (max 5 words)",
  "niche": "TECH_STARTUP" | "DEVTOOLS" | "SPIRITUAL" | "SPORTS" | "FINTECH" | "PRODUCTIVITY" | "GENERAL_BUSINESS",
  "visualPrompt": "A single compelling 3D minimalist image generation prompt (max 35 words) specifying visual elements, lighting, and product UI/metaphor for this exact subject. No distorted text."
}`;

    const completionPromise = openai.chat.completions.create({
      model: config.openai.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert visual director. Return ONLY a valid, parseable JSON object.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: 'json_object' }
    });

    // 3.5s strict timeout race so scheduler never lags
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI Entity Extraction timeout after 3.5s')), 3500)
    );

    const completion = await Promise.race([completionPromise, timeoutPromise]);
    const jsonText = completion.choices[0]?.message?.content?.trim();
    if (jsonText) {
      const parsed = JSON.parse(jsonText);
      logger.info(`[BrandExtractor] 🧠 AI Intent Extracted -> Brand: "${parsed.brandName || 'N/A'}", Subject: "${parsed.coreSubject}", Niche: "${parsed.niche}"`);
      return {
        brandName: parsed.brandName || heuristicBrand || null,
        coreSubject: parsed.coreSubject || heuristicBrand || cleanTopic,
        niche: parsed.niche || fallbackResult.niche,
        visualPrompt: parsed.visualPrompt || fallbackResult.visualPrompt,
      };
    }
  } catch (err) {
    logger.warn(`[BrandExtractor] AI entity extraction fallback used: ${err.message}`);
  }

  return fallbackResult;
}

/**
 * Collect all covered brands from a list of past post objects
 */
export function collectCoveredBrandsFromPosts(posts = []) {
  const brandsSet = new Set();

  for (const post of posts) {
    if (!post?.content) continue;
    const brand = extractBrandFromContent(post.content);
    if (brand && brand !== 'UnicodeHighlightedBrand') {
      brandsSet.add(brand);
    }
  }

  return Array.from(brandsSet);
}

export default {
  extractBrandFromContent,
  extractBrandAndVisualIntentWithAI,
  collectCoveredBrandsFromPosts,
  KNOWN_ENTITIES,
};

