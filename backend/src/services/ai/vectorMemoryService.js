import crypto from 'crypto';
import OpenAI from 'openai';
import config from '../../config/env.js';
import logger from '../../utils/logger.js';
import { prisma } from '../../config/db.js';

// In-memory LRU-style embedding cache (SHA-256 hash -> Float32Array)
const embeddingCache = new Map();
const MAX_CACHE_SIZE = 1000;

/**
 * Initialize OpenAI client for Embeddings
 */
const getOpenAIClient = () => {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }
  const apiKey = config.openai.apiKey;
  if (!apiKey || apiKey === 'your_openai_api_key_here' || apiKey.includes('placeholder') || apiKey.length < 25) {
    return null;
  }
  const clientConfig = { apiKey };
  if (config.openai.baseUrl) {
    clientConfig.baseURL = config.openai.baseUrl;
  }
  return new OpenAI(clientConfig);
};

/**
 * Generates a SHA-256 fingerprint for text to cache embeddings.
 */
function hashText(text) {
  return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
}

/**
 * High-Resolution 256-Dimensional Hashing & N-Gram Feature Vectorizer.
 * Provides resilient, zero-latency mathematical embeddings for offline/test mode.
 * Preserves semantic clustering via character n-grams and term frequency.
 */
export function generateLocalFeatureVector(text, dimensions = 256) {
  const vector = new Float32Array(dimensions);
  if (!text || typeof text !== 'string') return Array.from(vector);

  const clean = text.toLowerCase().replace(/[^\w\s]/g, ' ');
  const words = clean.split(/\s+/).filter(Boolean);

  // 1. Term frequency hashing
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let h1 = 0;
    for (let c = 0; c < word.length; c++) {
      h1 = (h1 * 31 + word.charCodeAt(c)) >>> 0;
    }
    const idx1 = h1 % dimensions;
    vector[idx1] += 1.5;

    // Word bi-grams for context
    if (i < words.length - 1) {
      const bigram = `${word}_${words[i + 1]}`;
      let h2 = 0;
      for (let c = 0; c < bigram.length; c++) {
        h2 = (h2 * 37 + bigram.charCodeAt(c)) >>> 0;
      }
      vector[h2 % dimensions] += 2.0;
    }
  }

  // 2. Character 3-grams for root-word & spelling resilience
  for (let i = 0; i < clean.length - 3; i++) {
    const tri = clean.slice(i, i + 3);
    let h3 = 0;
    for (let c = 0; c < 3; c++) {
      h3 = (h3 * 41 + tri.charCodeAt(c)) >>> 0;
    }
    vector[h3 % dimensions] += 0.5;
  }

  // 3. Normalize vector to unit length (L2 norm)
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] /= norm;
    }
  }

  return Array.from(vector);
}

/**
 * 1. Vector Embedding Generator
 * Generates dense vector embeddings using OpenAI 'text-embedding-3-small' (1536 dims).
 * Falls back transparently to Local Feature Vectorizer if offline or in test mode.
 */
export async function getEmbedding(text) {
  if (!text || typeof text !== 'string') {
    return generateLocalFeatureVector('');
  }

  const hash = hashText(text);
  if (embeddingCache.has(hash)) {
    return embeddingCache.get(hash);
  }

  const openai = getOpenAIClient();

  if (openai) {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000),
      });

      const embedding = response.data?.[0]?.embedding;
      if (embedding && Array.isArray(embedding)) {
        if (embeddingCache.size >= MAX_CACHE_SIZE) {
          const firstKey = embeddingCache.keys().next().value;
          embeddingCache.delete(firstKey);
        }
        embeddingCache.set(hash, embedding);
        return embedding;
      }
    } catch (err) {
      logger.warn(`[VectorMemoryService] OpenAI Embedding API failed (${err.message}). Using local vectorizer.`);
    }
  }

  const localVec = generateLocalFeatureVector(text);
  if (embeddingCache.size >= MAX_CACHE_SIZE) {
    const firstKey = embeddingCache.keys().next().value;
    embeddingCache.delete(firstKey);
  }
  embeddingCache.set(hash, localVec);
  return localVec;
}

/**
 * 2. Mathematical Cosine Similarity
 * Calculates cosine angle between two unit vectors.
 * Returns float in [0.0, 1.0].
 */
export function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length === 0 || vecB.length === 0) {
    return 0;
  }

  // Handle dimensional mismatch gracefully (e.g. if one is fallback and one is OpenAI)
  const length = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  const sim = dotProduct / magnitude;
  return Math.max(0, Math.min(1, sim));
}

/**
 * 3. Maximal Marginal Relevance (MMR) Retrieval Algorithm
 * Selects topK candidate documents that maximize relevance to query
 * while actively penalizing redundant similarity to already selected candidates.
 *
 * Formula: MMR = argmax [ lambda * Sim(d_i, Q) - (1 - lambda) * max_{d_j in S} Sim(d_i, d_j) ]
 *
 * @param {string} query - The target prompt or domain topic
 * @param {Array<Object>} candidatePosts - Array of past post objects { id, content, publishedAt, ... }
 * @param {number} topK - Number of diverse documents to select (default: 3)
 * @param {number} lambda - Diversity vs relevance balance (0.5 to 0.6 is optimal)
 * @returns {Promise<Array<Object>>} Selected diverse posts
 */
export async function computeMMR({ query, candidatePosts = [], topK = 3, lambda = 0.55 }) {
  if (!candidatePosts || candidatePosts.length === 0) {
    return [];
  }

  if (candidatePosts.length <= topK) {
    return candidatePosts;
  }

  // 1. Generate embeddings for query and all candidate posts
  const queryVec = await getEmbedding(query);
  const docVectors = await Promise.all(
    candidatePosts.map(p => getEmbedding(p.content || ''))
  );

  const selectedIndices = [];
  const remainingIndices = candidatePosts.map((_, idx) => idx);

  // 2. Iteratively select candidates balancing relevance and diversity
  while (selectedIndices.length < topK && remainingIndices.length > 0) {
    let bestScore = -Infinity;
    let bestIdx = -1;
    let bestRemainingPos = -1;

    for (let r = 0; r < remainingIndices.length; r++) {
      const candidateIdx = remainingIndices[r];
      const candidateVec = docVectors[candidateIdx];

      // Relevance to query
      const relevance = cosineSimilarity(candidateVec, queryVec);

      // Redundancy: max similarity to any already-selected document
      let maxRedundancy = 0;
      for (const selIdx of selectedIndices) {
        const selVec = docVectors[selIdx];
        const sim = cosineSimilarity(candidateVec, selVec);
        if (sim > maxRedundancy) {
          maxRedundancy = sim;
        }
      }

      // MMR score calculation
      const mmrScore = (lambda * relevance) - ((1 - lambda) * maxRedundancy);

      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = candidateIdx;
        bestRemainingPos = r;
      }
    }

    if (bestIdx !== -1) {
      selectedIndices.push(bestIdx);
      remainingIndices.splice(bestRemainingPos, 1);
    } else {
      break;
    }
  }

  return selectedIndices.map(idx => candidatePosts[idx]);
}

/**
 * 4. The Anti-Duplicate Shield
 * Evaluates candidate draft against the user's historical posts (past 7-14 days).
 * If Cosine Similarity >= threshold (default 0.85), flags duplicate content for regeneration.
 *
 * @param {string} candidateText - Newly generated post content
 * @param {Array<Object>} recentPosts - Posts from past 7-14 days
 * @param {number} threshold - Cosine similarity rejection threshold (default: 0.85)
 */
export async function checkAntiDuplicateShield({ candidateText, recentPosts = [], threshold = 0.85 }) {
  if (!candidateText || !recentPosts || recentPosts.length === 0) {
    return {
      passed: true,
      maxSimilarity: 0,
      threshold,
      matchedPost: null,
      matchedHook: null,
    };
  }

  const candidateVec = await getEmbedding(candidateText);

  let maxSimilarity = 0;
  let matchedPost = null;

  for (const post of recentPosts) {
    if (!post.content) continue;
    const postVec = await getEmbedding(post.content);
    const sim = cosineSimilarity(candidateVec, postVec);

    if (sim > maxSimilarity) {
      maxSimilarity = sim;
      matchedPost = post;
    }
  }

  const isDuplicate = maxSimilarity >= threshold;

  return {
    passed: !isDuplicate,
    isDuplicate,
    maxSimilarity: Number(maxSimilarity.toFixed(4)),
    threshold,
    matchedPost: matchedPost ? {
      id: matchedPost.id,
      publishedAt: matchedPost.publishedAt,
      snippet: matchedPost.content.slice(0, 120),
    } : null,
    matchedHook: matchedPost?.content ? matchedPost.content.split('\n')[0].slice(0, 90) : null,
  };
}

/**
 * 5. Explicit Negative Context Builder (The Blacklist)
 * Extracts opening hooks, covered angles, and structural formulas from recent posts
 * and generates a strict [MANDATORY NEGATIVE CONSTRAINTS - DO NOT REPEAT] directive.
 */
export function buildNegativeConstraints({ recentPosts = [], count = 5 }) {
  if (!recentPosts || recentPosts.length === 0) {
    return '';
  }

  const sample = recentPosts.slice(0, count);
  const hooks = [];
  const coveredTopics = [];

  sample.forEach((p, idx) => {
    if (!p.content) return;
    const firstLine = p.content.split('\n')[0]?.trim();
    if (firstLine) {
      hooks.push(`- Post #${idx + 1} Hook: "${firstLine.slice(0, 100)}"`);
    }

    // Extract potential brand/topic keywords
    const keywords = p.content.match(/#\w+|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g);
    if (keywords) {
      coveredTopics.push(...keywords.slice(0, 3));
    }
  });

  const uniqueTopics = Array.from(new Set(coveredTopics)).slice(0, 8);

  return `[MANDATORY NEGATIVE CONSTRAINTS & ANTI-REPETITION BLACKLIST]
The following dispatches were ALREADY published in the past 7-14 days:
${hooks.join('\n')}
${uniqueTopics.length > 0 ? `Recently covered subjects/entities to AVOID repeating: ${uniqueTopics.join(', ')}` : ''}

STRICT ANTI-TEMPLATE RULES:
1. FORBIDDEN HOOKS: Do NOT reuse the opening hooks, sentence cadence, or pattern-interrupt phrases shown above.
2. ANGLE DIVERSIFICATION: If previous posts were contrarian teardowns, pivot to an actionable playbook or reflective personal insight.
3. ZERO RECYCLED PHRASES: Do NOT repeat the core moral, punchline, or ending question from the above dispatches.
4. FRESH ENTRY POINT: Find an unexpected, novel angle that feels 100% distinct to the reader's feed.`;
}

/**
 * 6. Structural Variety & Dynamic Temperature Engine
 * Provides 5 distinct architectural post frameworks to defeat template fatigue.
 */
export const STRUCTURAL_ARCHETYPES = {
  CONTRARIAN_NARRATIVE: {
    key: 'CONTRARIAN_NARRATIVE',
    name: 'The Contrarian Narrative',
    temperature: 0.84,
    top_p: 0.92,
    directive: `STRUCTURAL ARCHETYPE: CONTRARIAN NARRATIVE
- Flow: Bold counter-intuitive observation -> Ground-level friction or hidden trap -> The surprising realization -> Practical peer-to-peer lesson.
- Tone: Peer-to-peer, authentic, non-preachy. STRICTLY PROHIBIT "🎯 Moral of the story:" or schoolteacher lectures.
- Formatting: Short, punchy prose paragraphs (1-2 sentences each). High whitespace. STRICTLY NO bullet points or numbered lists.`,
  },
  TACTICAL_PLAYBOOK: {
    key: 'TACTICAL_PLAYBOOK',
    name: 'The Tactical Playbook',
    temperature: 0.80,
    top_p: 0.90,
    directive: `STRUCTURAL ARCHETYPE: TACTICAL PLAYBOOK
- Flow: High-signal hook line -> Brief context sentence -> Exactly 3 actionable execution steps with clean double-digit numbering (01., 02., 03.) or bold titles -> Wrap-up observation -> Thoughtful discussion question.
- Tone: Tactical, practical, direct. AVOID identical repetitive emoji pins (no "📌 1.").
- Formatting: Clean numbered takeaways with uppercase headers and brief explanations.`,
  },
  PUNCHY_ONE_LINER: {
    key: 'PUNCHY_ONE_LINER',
    name: 'The Punchy Micro-Statement',
    temperature: 0.86,
    top_p: 0.94,
    directive: `STRUCTURAL ARCHETYPE: PUNCHY MICRO-STATEMENT
- Flow: Ultra-concise, high-impact pattern interrupt -> 2 to 3 single-sentence observations separated by blank lines -> Sharp closing truth bomb + single question.
- Formatting: Maximum whitespace. 60-120 words maximum. Every line must hit like a headline. Zero fluff.`,
  },
  FORENSIC_TEARDOWN: {
    key: 'FORENSIC_TEARDOWN',
    name: 'The Forensic Teardown (X vs Y)',
    temperature: 0.82,
    top_p: 0.92,
    directive: `STRUCTURAL ARCHETYPE: FORENSIC TEARDOWN (X vs Y)
- Flow: Contrast two opposing methods (What amateurs do vs What category leaders do) -> The anatomical breakdown of why the second works -> The underlying logic -> Thoughtful closing question.
- Formatting: Clear comparative breakdown with high visual rhythm.`,
  },
  PRACTICAL_FRAMEWORK: {
    key: 'PRACTICAL_FRAMEWORK',
    name: 'The 3-Step Framework',
    temperature: 0.80,
    top_p: 0.90,
    directive: `STRUCTURAL ARCHETYPE: THE 3-STEP FRAMEWORK
- Flow: The overlooked trap -> The mental shift -> Step 1: Foundation -> Step 2: Acceleration -> Step 3: Compounding -> Actionable discussion prompt.
- Formatting: Structured step-by-step layout with generous line breaks and zero preachiness.`,
  },
};

/**
 * Dynamic Hook Archetypes (The Anti-Template Hook Roulette)
 * Prevents the engine from collapsing into "Unpopular truth:" or "Most people think X..."
 */
export const HOOK_ARCHETYPES = [
  {
    name: 'The Contrarian Flip',
    instruction: 'Open with a surprising flip on conventional wisdom (e.g., why a standard industry belief actually creates hidden failure).',
  },
  {
    name: 'The Forensic Metric / In-Media-Res',
    instruction: 'Start right in the middle of a concrete moment or surprising data point without polite warmup.',
  },
  {
    name: 'The Honest Observation',
    instruction: 'Open with a raw, peer-to-peer observation about a real friction or dilemma everyone experiences but few discuss openly.',
  },
  {
    name: 'The Perspective Shift',
    instruction: 'Open with an intriguing distinction between how beginners perceive the problem vs how experts solve it.',
  },
  {
    name: 'The Direct Question Hook',
    instruction: 'Open with a provocative, one-sentence question that immediately forces the reader to mentally answer before scrolling.',
  },
];

export function selectHookArchetype(retryCount = 0) {
  const idx = (Math.floor(Math.random() * HOOK_ARCHETYPES.length) + retryCount) % HOOK_ARCHETYPES.length;
  return HOOK_ARCHETYPES[idx];
}

/**
 * Automatically rotates or selects a structural archetype that differs from recent posts.
 */
export function selectStructuralArchetype({ requestedFormat, recentPosts = [], retryCount = 0 }) {
  const archetypeKeys = Object.keys(STRUCTURAL_ARCHETYPES);

  // If user explicitly mandated BULLETS or ONE_LINER, honor it directly
  const fmt = (requestedFormat || '').toUpperCase();
  if (['BULLETS', 'BULLET_POINTS', 'LIST'].includes(fmt)) {
    return STRUCTURAL_ARCHETYPES.TACTICAL_PLAYBOOK;
  }
  if (['ONE_LINERS', 'ONE_LINER', 'PUNCHY'].includes(fmt)) {
    return STRUCTURAL_ARCHETYPES.PUNCHY_ONE_LINER;
  }
  if (['PARAGRAPHS', 'SINGLE', 'STANDARD'].includes(fmt) && retryCount === 0) {
    return STRUCTURAL_ARCHETYPES.CONTRARIAN_NARRATIVE;
  }

  // Dynamic rotation: select an archetype based on post count & retry attempts
  const offset = (recentPosts.length + retryCount) % archetypeKeys.length;
  const selectedKey = archetypeKeys[offset];
  return STRUCTURAL_ARCHETYPES[selectedKey] || STRUCTURAL_ARCHETYPES.CONTRARIAN_NARRATIVE;
}

/**
 * Fetches the user's recent published/scheduled posts from the PostgreSQL database (last 7-14 days).
 */
export async function fetchRecentUserPosts({ userId, days = 14, limit = 15 }) {
  if (!userId) return [];

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const posts = await prisma.post.findMany({
      where: {
        userId,
        status: { in: ['PUBLISHED', 'SCHEDULED'] },
        createdAt: { gte: cutoffDate },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        content: true,
        tone: true,
        targetPlatforms: true,
        mediaType: true,
        publishedAt: true,
        createdAt: true,
      },
    });

    return posts;
  } catch (err) {
    logger.warn(`[VectorMemoryService] Could not fetch recent posts for user "${userId}": ${err.message}`);
    return [];
  }
}
