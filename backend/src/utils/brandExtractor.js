/**
 * Brand & Entity Extractor Utility
 * Extracts company names, products, and key subjects from posts and prompts
 * to build anti-repetition memory and diverse content generation.
 */

// Common known products/brands dictionary for rapid matching
const KNOWN_ENTITIES = [
  'Zoom', 'Loom', 'Notion', 'Skyscanner', 'Where is my Train', 'Where Is My Train',
  'Zapier', 'Canva', 'Figma', 'Stripe', 'Supabase', 'Linear', 'Airtable', 'Webflow',
  'Shopify', 'Calendly', 'Grammarly', 'GitHub', 'Miro', 'Postman', 'Brex', 'Ramp',
  'Retool', 'ElevenLabs', 'Runway', 'Midjourney', 'Perplexity', 'ClickUp', 'Discord',
  'Airbnb', 'Spotify', 'Uber', 'Netflix', 'Slack', 'Asana', 'Monday.com', 'Trello',
  'Coda', 'Raycast', 'Vercel', 'Netlify', 'PostHog', 'Segment', 'Intercom', 'HubSpot',
  'Buffer', 'Hootsuite', 'Klaviyo', 'Substack', 'Medium', 'LottieFiles', 'Typeform',
  'Duolingo', 'Coursera', 'Udemy', 'Headspace', 'Calm', 'Oura', 'Whoop', 'Strava',
  'Wise', 'Revolut', 'Robinhood', 'Plaid', 'Coinbase', 'Square', 'Toast', 'Deel',
  'Remote.com', 'Rippling', 'Gusto', 'Carta', 'AngelList', 'Product Hunt', 'Mealify', 'SonicSphere'
];

/**
 * Extract hero brand or product name from post content
 */
export function extractBrandFromContent(content) {
  if (!content || typeof content !== 'string') return null;

  // 1. Check known entities in first 300 characters
  const headerSlice = content.slice(0, 400);
  for (const entity of KNOWN_ENTITIES) {
    const regex = new RegExp(`\\b${entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(headerSlice)) {
      return entity;
    }
  }

  // 2. Pattern: "When [Brand] was..." or "When [Brand] acquired..." or "When [Brand] launched..."
  const whenMatch = headerSlice.match(/When\s+([A-Z][A-Za-z0-9_.-]+(?:\s+[A-Z][A-Za-z0-9_.-]+)?)\s+(?:was|launched|acquired|revolutionized|disrupted|created|introduced|scaled)/i);
  if (whenMatch && whenMatch[1] && !['A', 'The', 'In', 'This', 'Every', 'Our'].includes(whenMatch[1])) {
    return whenMatch[1].trim();
  }

  // 3. Pattern: "Meet [Brand]..."
  const meetMatch = headerSlice.match(/Meet\s+(?:the\s+)?([A-Z][A-Za-z0-9_.-]+(?:\s+[A-Z][A-Za-z0-9_.-]+)?)/i);
  if (meetMatch && meetMatch[1] && !['The', 'Our', 'A', 'This'].includes(meetMatch[1])) {
    return meetMatch[1].trim();
  }

  // 4. Pattern: Unicode bold brand name (e.g. 𝗡𝗼𝘁𝗶𝗼𝗻, 𝗦𝗼𝗻𝗶𝗰𝗦𝗽𝗵𝗲𝗿𝗲)
  const firstLine = content.split('\n')[0] || '';
  const boldMatch = firstLine.match(/[\uD835][\uDC00-\uDFFF]+/g);
  if (boldMatch && boldMatch.length > 0) {
    // Unicode bold string detected
    return 'UnicodeHighlightedBrand';
  }

  return null;
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
  collectCoveredBrandsFromPosts,
  KNOWN_ENTITIES,
};
