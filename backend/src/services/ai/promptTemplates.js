/**
 * Centralized Prompt Templates, Defaults, and Message Builders for AI Engine.
 * Decouples prompt formatting data from core service logic.
 */

export const DEFAULT_PROMPT_CONFIG = {
  ARTICLE_DEFAULT_INSTRUCTION: 'Summarize the key takeaways for social media.',
  FALLBACK_TOPIC: 'Scaling workflow productivity with intelligent automation',
  DEFAULT_BRAND_CONTEXT: 'Business growth, tech insights, and audience engagement.',
};

export const SYSTEM_PROMPTS = {
  INSTAGRAM: `You are a master Instagram Content Creator & Storyteller. 
Create a high-converting Instagram post package that includes:
- A strong attention-grabbing Pattern Interrupt hook in the first 2 lines
- Value-packed narrative body text formatted with emojis and clean line breaks
- Clear Call to Action (CTA) encouraging comments, saves, or bio clicks
- 8-15 hyper-relevant industry hashtags separated at the end.
- CRITICAL SINGLE-SUBJECT RULE: If the prompt mentions multiple examples or choices, select EXACTLY ONE primary subject for this post. Never combine or list multiple subjects unless a direct comparison is requested.
- IF TONE IS STORYTELLING OR NARRATIVE: Follow the Story Arc: Pattern Interrupt Hook -> Empathy Friction -> Breakthrough Solution -> 3 Takeaways -> Moral of the Story -> Comment CTA.`,

  LINKEDIN: `You are an elite B2B Thought Leader, Brand Strategist, and Master Storyteller.
Create an extraordinary LinkedIn post package that includes:
- A Pattern Interrupt hook in line 1. CRITICAL HOOK RULE: NEVER start with "Discover how...", "In today's fast-paced business world...", "In the world of...", or generic corporate fluff. ALWAYS start with a strong, scroll-stopping 1-line hook tailored to the selected Tone & Intent:
  * For STORYTELLING / CASE STUDY: Start with a dramatic real-world metric, event, or customer friction line.
  * For ENGAGING / CASUAL: Start with a thought-provoking question or relatable observation.
  * For PROFESSIONAL / INSIGHTS: Start with a sharp industry statistic, trend, or bold claim.
  * For POETRY / SHAYARI: Start with an evocative, emotional opening line.
  * For HUMOROUS: Start with a witty, relatable observation.
  * For PROMOTIONAL: Start with a high-urgency value proposition line.
- Well-structured paragraph breaks for mobile readability
- 3 Actionable takeaways formatted with Unicode Bold titles (e.g. 𝟭. 𝗖𝘂𝘀𝘁𝗼𝗺𝗲𝗿 𝗙𝗿𝗶𝗰𝘁𝗶𝗼𝗻 𝗙𝗶𝗿𝘀𝘁)
- Professional yet deeply authentic tone
- 3-5 hyper-relevant industry hashtags at the end.
- CRITICAL SINGLE-SUBJECT RULE: Focus 100% on EXACTLY ONE product/subject per post. Even if multiple products or examples are listed in the prompt, pick ONLY ONE primary subject and tell its complete story from start to finish. Never list multiple products in the same post.
- IF TONE IS STORYTELLING OR CASE STUDY: Follow the Narrative Arc:
  1. Pattern Interrupt Hook (Scroll-stopping line 1 with real-world acquisition/metric facts if available)
  2. Empathy Friction (The real-world customer pain point)
  3. The Breakthrough Solution & Target Audience
  4. Why it Succeeded (Product mechanics & deal context if available)
  5. 3 Strategic Actionable Takeaways
  6. Moral of the Story (Philosophical takeaway)
  7. Algorithm-Boosting Comment CTA Question`,

  X: `You are a viral X (Twitter) Copywriter & Thread Creator.
Create concise, high-impact content:
- For single tweets: keep under 270 characters, punchy, clear hook, minimal hashtags (0-2 max).
- If topic or format style requires deep explanation or thread format: format as a numbered Twitter Thread (e.g. 1/, 2/, 3/).
- CRITICAL SINGLE-SUBJECT RULE: Focus on EXACTLY ONE primary subject per tweet/thread.`,

  FACEBOOK: `You are an expert Facebook Page Copywriter & Social Media Strategist.
Create an engaging Facebook post that includes:
- A strong engaging hook in the first sentence
- Conversational, community-oriented story or value drop
- Clean formatting with line breaks for readability
- Open question or CTA encouraging comments and page likes
- 3-5 relevant hashtags at the end.
- CRITICAL SINGLE-SUBJECT RULE: Focus on EXACTLY ONE main theme or subject per post.`,
  
  GENERAL: `You are a master Social Media Content Strategist. Adapt content perfectly for social media audience engagement with single-subject focus.`
};

/**
 * Build the user prompt message for article-repurposing runs.
 */
export function buildArticleUserPrompt({ articleUrl, article, inputTopic, tone, platform }) {
  const instructions = inputTopic || DEFAULT_PROMPT_CONFIG.ARTICLE_DEFAULT_INSTRUCTION;

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

/**
 * Format system control instructions (emoji density, hashtags, format style, length, tone).
 */
export function buildFormattingInstructions({ emojiDensity, hashtagCount, formatStyle, contentLength, tone }) {
  const toneMap = {
    STORYTELLING: 'NARRATIVE STORYTELLING (Follow Hook -> Empathy Friction -> Breakthrough -> 3 Takeaways -> Moral of Story -> Comment CTA)',
    ENGAGING: 'HIGH-ENERGY & CONVERSATIONAL (Focus on viral hooks, relatable reflections, and open audience questions)',
    PROFESSIONAL: 'B2B THOUGHT LEADERSHIP (Authoritative, data-backed insights, executive clarity, strategic takeaways)',
    CASUAL: 'AUTHENTIC PEER-TO-PEER (Friendly, relatable, conversational tone without corporate jargon)',
    HUMOROUS: 'WITTY & LIGHT-HEARTED (Relatable humor, punchy observations, entertaining delivery)',
    PROMOTIONAL: 'DIRECT PRODUCT ANNOUNCEMENT (High urgency, clear value proposition, strong Call-to-Action)',
  };

  const selectedToneDirective = toneMap[tone?.toUpperCase()] || `TONE: ${tone || 'ENGAGING'}`;

  return `\n\nFormatting & Tone Controls:
- Tone of Voice Directive: ${selectedToneDirective}
- Emoji Density: ${emojiDensity} (NONE = 0 emojis, LOW = 1-2 subtle emojis at headers, MEDIUM = 3-5 emojis on bullet points and takeaways, HIGH = vibrant emoji layout on every section).
* EMOJI PLACEMENT MANDATE: When Emoji Density is LOW, MEDIUM, or HIGH, you MUST place relevant emojis next to key takeaways, moral of the story, or CTA lines (e.g., 📌 3 Key Takeaways, 🎯 Moral of the story, 💡 CTA question). Do not omit emojis when LOW, MEDIUM, or HIGH is selected.
- Hashtag Strategy Directive: ${hashtagCount} (NONE = 0 hashtags, FEW_3 / 3 = 3 targeted hashtags, MODERATE_5 / 5 = 5 hashtags, GROWTH_8 / 8 = 8 hashtags, VIRAL_12 / HEAVY = 12 niche hashtags).
- Output Format Style: ${formatStyle} (SINGLE = standard single post, THREAD = numbered 1/ 2/ 3/ thread breakdown, CAROUSEL = structured slide-by-slide outline)
${formatStyle === 'CAROUSEL' ? `- CAROUSEL PLATFORM ADAPTATION DIRECTIVE:
  * For INSTAGRAM: Output a clean [INSTAGRAM CAPTION BELOW POST] (intro & hashtags) + [SLIDE 1 TO 5 GRAPHIC OVERLAYS] (text for 5 image slides).
  * For LINKEDIN: Output a clean [LINKEDIN FEED INTRO CAPTION] (intro pointing to document) + [SLIDE 1 TO 5 PDF DOCUMENT PAGES] (text for 5 PDF slides).
  * For X (TWITTER): Adapt carousel slides into a [NUMBERED TWITTER THREAD (1/, 2/, 3/, 4/, 5/)].` : ''}
- Character Length Target: ${contentLength} (CONCISE = ~100-300 characters, BALANCED = ~400-1000 characters, DETAILED = ~1000-2500 characters, LONG_FORM = ~3000-6000 characters for deep-dive story teardowns).
* HASHTAG SEPARATION & BODY LENGTH MANDATE: You MUST write the complete body narrative (hook, friction, solution, takeaways, moral, CTA) to fulfill 100% of the requested character length (${contentLength}) BEFORE adding hashtags. Do NOT count hashtag characters toward the body copy target. Append the hashtags as a separate block at the very bottom of the post after a double blank line.`;
}

export const MOCK_CASE_STUDIES = [
  {
    company: 'Loom',
    headline: 'Great products don\'t just sell features—they solve real human problems.',
    story: 'Loom solved meeting fatigue by creating 2-minute async screen video recordings. Instead of forcing 4 team members into a 30-minute meeting to explain a feature, one link in Slack explained everything.',
    problem: '4 hours wasted daily in low-signal status update meetings.',
    moral: 'Eliminate 3 friction steps in a user routine, and product-led acquisition happens virally.',
  },
  {
    company: 'Where is my Train',
    headline: 'Innovation isn\'t built for ideal conditions—it\'s built for ground-level realities.',
    story: '"Where is My Train" built an offline cell-triangulation algorithm for Indian Railways commuters who lost internet data inside moving train coaches (acquired by Google).',
    problem: 'Millions of commuters losing cell network and missing train arrivals.',
    moral: 'Build for the exact constraints of your target audience, not for perfect network conditions.',
  },
  {
    company: 'Skyscanner',
    headline: 'Transparency is the ultimate moat in a fragmented industry.',
    story: 'Skyscanner aggregated price comparisons across hundreds of global airlines into one transparent search engine (acquired for $1.7B).',
    problem: 'Travelers having to manually check 20 different airline sites.',
    moral: 'Bring radical clarity to complex choices, and customer trust follows.',
  },
  {
    company: 'Canva',
    headline: 'Empower non-experts to create expert-level outcomes.',
    story: 'Canva made graphic design accessible to 100M+ non-designers using drag-and-drop templates instead of complex $50/mo software.',
    problem: 'Small business owners unable to afford expensive graphic design tools or agency retainers.',
    moral: 'Democratize complex skills, and your addressable market becomes limitless.',
  },
  {
    company: 'Duolingo',
    headline: 'Gamification turns difficult habits into daily addiction.',
    story: 'Duolingo converted language learning into a 5-minute daily streak game, maintaining millions of active users.',
    problem: '80%+ drop-off rate in traditional language learning courses.',
    moral: 'Small daily dopamine loops create long-term user retention.',
  },
];
