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
Create a high-converting Instagram post package that honors the user's topic:
- A strong attention-grabbing Pattern Interrupt hook in the first 2 lines appropriate to the topic (spiritual, motivational, lifestyle, or business)
- Value-packed narrative body text formatted with emojis and clean line breaks
- Clear Call to Action (CTA) encouraging comments, saves, or shares
- 8-15 hyper-relevant hashtags separated at the end.
- CRITICAL TOPIC FIDELITY: If the prompt is spiritual, devotional, or mindfulness (e.g. 'Om Namah Shivaaye'), write a heartfelt, peaceful, and inspirational post honoring that sacred topic. NEVER treat it as an app, SaaS company, or startup!
- CRITICAL SINGLE-SUBJECT RULE: Focus 100% on the primary subject requested.`,

  LINKEDIN: `You are an elite LinkedIn Growth Strategist and Viral Copywriter who crafts top 1% viral content.
Create an extraordinary, high-dwell-time LinkedIn post package that honors the user's topic:
- A Pattern Interrupt Hook in Line 1. Adapt the hook naturally to the topic type:
  * For Business/Product Case Studies: Open with a surprising contrarian observation, a forensic metric, or an in-media-res scene. STRICTLY FORBIDDEN: Do NOT open with "Unpopular truth: The best products don't add features—they remove friction." or any variant of that cliché.
  * For Spiritual, Mindfulness & Devotional topics: Open with a profound, resonant reflection on inner peace, stillness amid chaos, or timeless spiritual grounding (e.g., "In a world that never stops rushing, ancient wisdom offers a stillness we desperately need..."). NEVER treat spiritual mantras, gods, or beliefs as tech apps or startups!
  * For Motivational & Life topics: Open with a sharp, relatable mindset shift or habit reflection.
- Mobile-First Formatting: Keep paragraphs strictly to 1-2 concise sentences with white space for maximum mobile dwell time.
- Format Layout Directive: Strictly honor the user's chosen Format Style directive below. When Standard Paragraphs is requested, NEVER output bullet points, numbered lists, or "📌 1. ..." headers. Instead, convey all insights through continuous, elegant paragraphs. Only format key takeaways as bullet points or numbered lists if Bullet Points format is specifically requested.
- 3-5 hyper-relevant hashtags at the end.
- PRODUCT WEBSITE LINK MANDATE: ONLY when the post is explicitly about a real tech tool or product requested by the user, include an official link. NEVER fabricate, hallucinate, or invent a fake website URL (e.g. never invent www.omnamahshivaye.com) for spiritual, cultural, or non-product topics.
- CRITICAL TOPIC FIDELITY: Focus 100% on the user's actual prompt. Never force spiritual, personal, cultural, or artistic topics into a tech startup or SaaS framework.
- ENGAGING CTA: End with a thoughtful question or prompt that encourages comments and discussion appropriate to the topic.
- ANTI-BOT HUMAN CADENCE & ZERO-CLICHÉ MANDATE: Write with natural human cadence and high burstiness (mix 3-5 word punchy lines with 15-20 word descriptive sentences). Strictly avoid generic AI filler phrases (e.g., "In today's fast-paced world", "delve into", "tapestry", "game-changer", "testament", "Let that sink in", "Read that again", "Agree?"). STRICTLY FORBID "🎯 Moral of the story:" or schoolteacher lectures.`,

  X: `You are a viral X (Twitter) Copywriter & Thread Creator.
Create concise, high-impact content that strictly honors the user's topic:
- For single tweets: keep under 270 characters, punchy, clear hook, minimal hashtags (0-2 max).
- If topic or format style requires deep explanation or thread format: format as a numbered Twitter Thread (e.g. 1/, 2/, 3/).
- CRITICAL TOPIC FIDELITY: If the prompt is spiritual, devotional, or cultural (e.g. 'Om Namah Shivaaye'), write a resonant, thoughtful, and inspiring tweet/thread about its spiritual significance. Never invent fake apps, products, or links.
- CRITICAL SINGLE-SUBJECT RULE: Focus on EXACTLY ONE primary subject per tweet/thread.`,

  FACEBOOK: `You are an expert Facebook Page Copywriter & Social Media Strategist.
Create an engaging Facebook post that includes:
- A strong engaging hook in the first sentence appropriate to the topic
- Conversational, community-oriented story or value drop
- Clean formatting with line breaks for readability
- Open question or CTA encouraging comments and page likes
- 3-5 relevant hashtags at the end.
- CRITICAL SINGLE-SUBJECT RULE: Focus on EXACTLY ONE main theme or subject per post.`,
  
  GENERAL: `You are a master Social Media Content Strategist. Adapt content perfectly for social media audience engagement with authentic topic fidelity.`
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
    STORYTELLING: 'NARRATIVE STORYTELLING (Follow Hook -> Relatable Context -> Breakthrough -> Meaningful Reflection -> Concluding CTA)',
    ENGAGING: 'HIGH-ENERGY & CONVERSATIONAL (Focus on viral hooks, relatable reflections, and open audience questions)',
    PROFESSIONAL: 'B2B THOUGHT LEADERSHIP (Authoritative, data-backed insights, executive clarity, strategic takeaways)',
    CASUAL: 'AUTHENTIC PEER-TO-PEER (Friendly, relatable, conversational tone without corporate jargon)',
    HUMOROUS: 'WITTY & LIGHT-HEARTED (Relatable humor, punchy observations, entertaining delivery)',
    PROMOTIONAL: 'DIRECT PRODUCT ANNOUNCEMENT (High urgency, clear value proposition, strong Call-to-Action)',
  };

  const selectedToneDirective = toneMap[tone?.toUpperCase()] || `TONE: ${tone || 'ENGAGING'}`;

  // Format Style Normalization & Dynamic Sub-Layout Catalogs
  const rawFmt = (formatStyle || 'PARAGRAPHS').toUpperCase();

  // 1. DYNAMIC CATALOG: BULLET POINTS (Multiple distinct bullet structures)
  const BULLET_LAYOUT_CATALOG = [
    {
      id: 'BULLETS_PROGRESSIVE_NUMBERED',
      directive: `- Output Format Style: BULLET POINTS (PROGRESSIVE NUMBERED BLUEPRINT).
  * Structure: 
    - Engaging hook and brief introductory sentence.
    - 3-4 progressive chronological steps formatted with clean double digits: "01. TITLE: ...", "02. TITLE: ...", "03. TITLE: ...".
    - Concluding wrap-up takeaway and CTA.
  * Bullet Marker Style: Clean double digits (01., 02., 03.).`
    },
    {
      id: 'BULLETS_VARIED_CONTEXTUAL_EMOJIS',
      directive: `- Output Format Style: BULLET POINTS (TOPIC-RELEVANT CONTEXTUAL EMOJI BADGES).
  * Structure:
    - Compelling hook and brief context paragraph.
    - 3-4 takeaways, each with a UNIQUE, DIFFERENT emoji that matches the specific topic context (e.g. if spiritual: 🧘, ✨, 🌊; if business: ⚡, 🎯, 💡). Do NOT repeat the exact same emoji on every line!
    - Clean UPPERCASE Header followed by a punchy 1-2 sentence explanation.
    - Concluding discussion CTA.
  * Bullet Marker Style: Contextual emojis (different on every bullet).`
    },
    {
      id: 'BULLETS_CONTRAST_PAIRS',
      directive: `- Output Format Style: BULLET POINTS (HIGH-CONTRAST / MYTH VS REALITY).
  * Structure:
    - Provocative hook about why common approaches fall short.
    - 3 contrasting bullet pairs that flip conventional thinking:
      ❌ The Illusion / Trap: ...
      ✅ The Shift / Reality: ...
    - Powerful takeaway synthesis paragraph and engaging CTA.
  * Bullet Marker Style: High-contrast comparison pairs (❌ vs ✅).`
    },
    {
      id: 'BULLETS_EXECUTIVE_DASH',
      directive: `- Output Format Style: BULLET POINTS (EXECUTIVE EM-DASH MINIMALIST BULLETS).
  * Structure:
    - High-signal hook line followed by 1 blank line.
    - 3-4 concise, high-impact observations using subtle em-dashes ("— ") or clean bullet dots ("• ").
    - Avoid screaming uppercase headers—deliver pure, direct, conversational clarity and executive insight.
    - Thoughtful, low-key closing CTA.
  * Bullet Marker Style: Clean em-dashes (— ) or bullet dots (• ).`
    },
    {
      id: 'BULLETS_QUESTION_REVELATION',
      directive: `- Output Format Style: BULLET POINTS (QUESTION & REVELATION BULLETS).
  * Structure:
    - Introspective opening hook.
    - 3 bullet points, each structured as a bold question followed by an immediate breakthrough insight:
      • How do we cultivate this? By understanding that...
      • Where does friction emerge? When we mistakenly assume...
      • What is the daily anchor? Returning regularly to...
    - Concluding grounding reflection.
  * Bullet Marker Style: Bold question-and-answer bullet points.`
    },
    {
      id: 'BULLETS_ACTION_DIRECTIVES',
      directive: `- Output Format Style: BULLET POINTS (ACTION DIRECTIVE IMPERATIVES).
  * Structure:
    - Clear opening context.
    - 3-4 active imperative directives starting with strong action verbs:
      👉 Anchor your attention on...
      👉 Release the impulse to...
      👉 Observe the internal shift when...
    - Actionable summary and audience prompt.
  * Bullet Marker Style: Action pointer directives (👉).`
    }
  ];

  // 2. DYNAMIC CATALOG: STANDARD PARAGRAPHS (Multiple distinct pure prose structures, strictly 0 bullets)
  const PARAGRAPH_LAYOUT_CATALOG = [
    {
      id: 'PARAGRAPHS_NARRATIVE_ARC',
      directive: `- Output Format Style: STANDARD PARAGRAPHS (NARRATIVE SCENE ARC).
  * STRICT PROHIBITION: DO NOT use bullet points (no •, -, *), and DO NOT use numbered list takeaways (no "📌 1. ...").
  * Architecture:
    - Paragraph 1: 1-2 sentence immersive scene hook placing the reader in a relatable emotional moment or dilemma.
    - Paragraph 2: Substantive, descriptive middle paragraph exploring the friction, depth, and realization.
    - Paragraph 3: Concluding reflection smoothly resolving into a grounded, peaceful lesson.
  * Spacing: Pure flowing prose paragraphs separated by blank lines. 2-3 sentences each.`
    },
    {
      id: 'PARAGRAPHS_PHILOSOPHICAL_INVERSION',
      directive: `- Output Format Style: STANDARD PARAGRAPHS (PHILOSOPHICAL INVERSION & PARADIGM SHIFT).
  * STRICT PROHIBITION: DO NOT use bullet points (no •, -, *), and DO NOT use numbered list takeaways (no "📌 1. ...").
  * Architecture:
    - Paragraph 1: Examines the noisy external world or widespread human illusion.
    - Paragraph 2: Inverts the gaze inward to timeless wisdom, inner stillness, or the fundamental truth.
    - Paragraph 3: Weaves that realization into daily presence, clarity, and practical resilience.
  * Spacing: Pure flowing prose paragraphs separated by blank lines. 2-3 sentences each.`
    },
    {
      id: 'PARAGRAPHS_TRIAD_PROSE',
      directive: `- Output Format Style: STANDARD PARAGRAPHS (TRIAD POETIC CADENCE).
  * STRICT PROHIBITION: DO NOT use bullet points (no •, -, *), and DO NOT use numbered list takeaways (no "📌 1. ...").
  * Architecture:
    - 3 balanced, flowing paragraphs (2-3 sentences each) with high rhythmic cadence and breathing space.
    - Reads like an inspiring modern essay or reflective meditation with beautiful sentence variation.
  * Spacing: Pure flowing prose paragraphs separated by blank lines.`
    },
    {
      id: 'PARAGRAPHS_METAPHORIC_DEEP_DIVE',
      directive: `- Output Format Style: STANDARD PARAGRAPHS (METAPHORIC DEEP-DIVE).
  * STRICT PROHIBITION: DO NOT use bullet points (no •, -, *), and DO NOT use numbered list takeaways (no "📌 1. ...").
  * Architecture:
    - Paragraph 1: Anchors the entire thought in a striking natural or physical metaphor (e.g. ocean depths vs surface waves, unshakeable mountain, steady inner flame).
    - Paragraph 2: Deeply unpacks what this metaphor reveals about human resilience, mindfulness, or inner strength.
    - Paragraph 3: A quiet, memorable closing prose thought connecting it to our daily life.
  * Spacing: Pure flowing prose paragraphs separated by blank lines. 2-3 sentences each.`
    },
    {
      id: 'PARAGRAPHS_CADENCE_CONTRAST',
      directive: `- Output Format Style: STANDARD PARAGRAPHS (ASYMMETRIC CADENCE CONTRAST).
  * STRICT PROHIBITION: DO NOT use bullet points (no •, -, *), and DO NOT use numbered list takeaways (no "📌 1. ...").
  * Architecture:
    - Paragraph 1: A sharp, punchy 1-sentence opening hook paragraph.
    - Paragraph 2: An immersive multi-sentence exploration that builds depth and texture.
    - Paragraph 3: A 2-sentence grounding realization.
    - Paragraph 4: A 1-sentence lingering philosophical closer.
  * Spacing: Pure flowing prose paragraphs separated by blank lines.`
    }
  ];

  // 3. DYNAMIC CATALOG: PUNCHY ONE-LINERS (High white-space)
  const ONE_LINER_LAYOUT_CATALOG = [
    {
      id: 'ONE_LINERS_CASCADE',
      directive: `- Output Format Style: PUNCHY ONE-LINERS (RAPID-FIRE TRUTH CASCADE).
  * Write in fast, rhythmic single-line statements separated by blank lines.
  * Build emotional or intellectual tension line by line, concluding with an impactful punchline.
  * High white-space. No multi-sentence paragraph blocks and no bullet markers.`
    },
    {
      id: 'ONE_LINERS_PARADOX',
      directive: `- Output Format Style: PUNCHY ONE-LINERS (CONTRARIAN PARADOX & REALITY CHECK).
  * Punchy single-line statements that juxtapose surprising truths and flip conventional wisdom on its head.
  * High white-space, maximum tension, memorable closing statement. No bullet markers.`
    },
    {
      id: 'ONE_LINERS_MANIFESTO',
      directive: `- Output Format Style: PUNCHY ONE-LINERS (MINIMALIST RULES & MANIFESTO).
  * 4-6 bold, uncompromised rules or principles, each on its own line separated by a blank line.
  * Every line is an independent axiom. No filler words, no bullet markers.`
    }
  ];

  // 4. DYNAMIC CATALOG: CAROUSEL SLIDE DECK (Slide-by-slide)
  const CAROUSEL_LAYOUT_CATALOG = [
    {
      id: 'CAROUSEL_STEP_BY_STEP',
      directive: `- Output Format Style: CAROUSEL SLIDE DECK (ACTIONABLE 5-SLIDE BLUEPRINT).
  * Slide 1: Bold Cover Hook & Teaser.
  * Slides 2 to 4: Step 1, Step 2, and Step 3 actionable breakdown.
  * Slide 5: Recap Checklist & Save / Share CTA.
  * Include clear slide demarcations ([SLIDE 1], [SLIDE 2], etc.).`
    },
    {
      id: 'CAROUSEL_TRANSFORMATION',
      directive: `- Output Format Style: CAROUSEL SLIDE DECK (TRANSFORMATION JOURNEY).
  * Slide 1: The Struggle / Invisible Obstacle.
  * Slide 2: Why Conventional Methods Fail.
  * Slide 3: The Breakthrough Epiphany.
  * Slide 4: The Core Pillars of Freedom / Success.
  * Slide 5: Actionable Starting Step & CTA.
  * Include clear slide demarcations ([SLIDE 1], [SLIDE 2], etc.).`
    },
    {
      id: 'CAROUSEL_AFFIRMATIONS',
      directive: `- Output Format Style: CAROUSEL SLIDE DECK (VISUAL QUOTES & DEEP CONTEMPLATION).
  * Slide 1: Powerful Meditation / Contemplation Statement.
  * Slides 2 to 4: 3 Deep Reflections on Stillness, Strength, and Wisdom.
  * Slide 5: Daily Grounding Affirmation & Share Prompt.
  * Include clear slide demarcations ([SLIDE 1], [SLIDE 2], etc.).`
    }
  ];

  let formatDirective = '';
  const isBullets = ['BULLETS', 'BULLET_POINTS', 'LIST'].includes(rawFmt) || rawFmt.startsWith('BULLETS_');
  const isParagraphs = ['PARAGRAPHS', 'SINGLE', 'STANDARD'].includes(rawFmt) || rawFmt.startsWith('PARAGRAPHS_') || rawFmt === 'DYNAMIC_AUTO';
  const isOneLiners = ['ONE_LINERS', 'ONE_LINER', 'PUNCHY'].includes(rawFmt) || rawFmt.startsWith('ONE_LINERS_');
  const isCarousel = ['CAROUSEL', 'SLIDES'].includes(rawFmt) || rawFmt.startsWith('CAROUSEL_');

  if (isBullets) {
    // If a specific sub-layout was requested, match it; otherwise randomly pick from the rich bullet catalog
    const matched = BULLET_LAYOUT_CATALOG.find(b => b.id === rawFmt);
    const chosen = matched || BULLET_LAYOUT_CATALOG[Math.floor(Math.random() * BULLET_LAYOUT_CATALOG.length)];
    formatDirective = chosen.directive;
  } else if (isOneLiners) {
    const matched = ONE_LINER_LAYOUT_CATALOG.find(o => o.id === rawFmt);
    const chosen = matched || ONE_LINER_LAYOUT_CATALOG[Math.floor(Math.random() * ONE_LINER_LAYOUT_CATALOG.length)];
    formatDirective = chosen.directive;
  } else if (isCarousel) {
    const matched = CAROUSEL_LAYOUT_CATALOG.find(c => c.id === rawFmt);
    const chosen = matched || CAROUSEL_LAYOUT_CATALOG[Math.floor(Math.random() * CAROUSEL_LAYOUT_CATALOG.length)];
    formatDirective = chosen.directive;
  } else if (rawFmt === 'THREAD') {
    formatDirective = `- Output Format Style: NUMBERED SOCIAL THREAD.
  * Break the post into numbered thread segments (1/, 2/, 3/, etc.).`;
  } else {
    // Standard Paragraphs (Default): strictly prose, randomly picks from the rich paragraph catalog
    const matched = PARAGRAPH_LAYOUT_CATALOG.find(p => p.id === rawFmt);
    const chosen = matched || PARAGRAPH_LAYOUT_CATALOG[Math.floor(Math.random() * PARAGRAPH_LAYOUT_CATALOG.length)];
    formatDirective = chosen.directive;
  }

  // Emoji Density Normalization
  const emoji = (emojiDensity || 'BALANCED').toUpperCase();
  let emojiDirective = '';
  if (emoji === 'NONE' || emoji === 'ZERO') {
    emojiDirective = '- Emoji Density: ZERO EMOJIS (Strictly 0 emojis across the entire post text).';
  } else if (emoji === 'MINIMAL' || emoji === 'LOW') {
    emojiDirective = '- Emoji Density: MINIMAL (1-2 subtle, natural emojis at the opening or closing only).';
  } else if (emoji === 'EXPRESSIVE' || emoji === 'HIGH') {
    emojiDirective = '- Emoji Density: EXPRESSIVE (5+ vibrant emojis placed naturally throughout the text).';
  } else {
    emojiDirective = '- Emoji Density: BALANCED (2-4 natural emojis placed contextually for emphasis).';
  }

  // Hashtag Strategy Normalization
  const hash = (hashtagCount || 'FOCUSED').toUpperCase();
  let hashDirective = '';
  if (hash === 'NONE' || hash === 'ZERO') {
    hashDirective = '- Hashtag Strategy Directive: NONE (0 hashtags. Do NOT include any hashtags).';
  } else if (hash === 'FOCUSED' || hash === 'FEW' || hash === 'FEW_3' || hash === '3') {
    hashDirective = '- Hashtag Strategy Directive: FOCUSED (Exactly 2-3 targeted hashtags at the very bottom).';
  } else if (hash === 'MAX_REACH' || hash === 'HEAVY' || hash === 'VIRAL_12' || hash === 'GROWTH_8') {
    hashDirective = '- Hashtag Strategy Directive: MAX REACH (6-10 targeted niche hashtags at the very bottom).';
  } else {
    hashDirective = '- Hashtag Strategy Directive: STRATEGIC (3-5 targeted hashtags at the very bottom).';
  }

  // Character Length Target
  const len = (contentLength || 'BALANCED').toUpperCase();
  let lenDirective = '';
  if (len === 'SHORT' || len === 'CONCISE') {
    lenDirective = '- Character Length Target: SHORT (~100-300 characters / ~30-60 words). Keep it concise and punchy.';
  } else if (len === 'LONG_FORM' || len === 'DETAILED') {
    lenDirective = '- Character Length Target: LONG_FORM (~1200-2500 characters). Detailed, deep-dive breakdown.';
  } else {
    lenDirective = '- Character Length Target: BALANCED (~400-1000 characters). Standard social post length.';
  }

  return `\n\nFormatting & Tone Controls:
- Tone of Voice Directive: ${selectedToneDirective}
${emojiDirective}
${hashDirective}
${formatDirective}
${lenDirective}
* HASHTAG SEPARATION & BODY LENGTH MANDATE: You MUST write the complete body narrative before adding hashtags. Append the hashtags as a separate block at the very bottom of the post after a double blank line.`;
}

export const MOCK_CASE_STUDIES = [
  {
    company: 'Loom',
    headline: 'Great products don\'t just sell features—they solve real human problems.',
    story: 'Loom solved meeting fatigue by creating 2-minute async screen video recordings. Instead of forcing 4 team members into a 30-minute meeting to explain a feature, one link in Slack explained everything.',
    problem: '4 hours wasted daily in low-signal status update meetings.',
    takeaway: 'Eliminate 3 friction steps in a user routine, and product-led acquisition happens virally.',
  },
  {
    company: 'Where is my Train',
    headline: 'Innovation isn\'t built for ideal conditions—it\'s built for ground-level realities.',
    story: '"Where is My Train" built an offline cell-triangulation algorithm for Indian Railways commuters who lost internet data inside moving train coaches (acquired by Google).',
    problem: 'Millions of commuters losing cell network and missing train arrivals.',
    takeaway: 'Build for the exact constraints of your target audience, not for perfect network conditions.',
  },
  {
    company: 'Skyscanner',
    headline: 'Transparency is the ultimate moat in a fragmented industry.',
    story: 'Skyscanner aggregated price comparisons across hundreds of global airlines into one transparent search engine (acquired for $1.7B).',
    problem: 'Travelers having to manually check 20 different airline sites.',
    takeaway: 'Bring radical clarity to complex choices, and customer trust follows.',
  },
  {
    company: 'Canva',
    headline: 'Empower non-experts to create expert-level outcomes.',
    story: 'Canva made graphic design accessible to 100M+ non-designers using drag-and-drop templates instead of complex $50/mo software.',
    problem: 'Small business owners unable to afford expensive graphic design tools or agency retainers.',
    takeaway: 'Democratize complex skills, and your addressable market becomes limitless.',
  },
  {
    company: 'Duolingo',
    headline: 'Gamification turns difficult habits into daily addiction.',
    story: 'Duolingo converted language learning into a 5-minute daily streak game, maintaining millions of active users.',
    problem: '80%+ drop-off rate in traditional language learning courses.',
    takeaway: 'Small daily dopamine loops create long-term user retention.',
  },
];
