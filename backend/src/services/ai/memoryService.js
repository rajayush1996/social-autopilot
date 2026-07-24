import OpenAI from 'openai';
import { prisma } from '../../config/db.js';
import config from '../../config/env.js';
import logger from '../../utils/logger.js';
import { encrypt, decrypt } from '../../utils/encryption.js';

// Initialize OpenAI client (same as in aiService.js)
const getOpenAIClient = () => {
  const apiKey = config.openai.apiKey;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    return null;
  }
  const clientConfig = { apiKey };
  if (config.openai.baseUrl) {
    clientConfig.baseURL = config.openai.baseUrl;
  }
  return new OpenAI(clientConfig);
};

/**
 * Update user's rolling content summary memory following new post publication.
 * Runs asynchronously and logs errors gracefully so it never blocks the publishing worker pipeline.
 * 
 * @param {String} userId 
 * @param {String} newPostContent 
 */
export async function updateUserMemory(userId, newPostContent) {
  if (!userId || !newPostContent) return;

  try {
    logger.info(`[MemoryService] 🧠 Updating rolling content summary memory for user "${userId}"...`);
    
    // 1. Fetch user's profile to extract current memory summary
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { contentSummary: true },
    });

    if (!user) {
      logger.warn(`[MemoryService] User "${userId}" not found in database. Skipping memory compaction.`);
      return;
    }

    // Decrypt the existing summary before passing to OpenAI
    const currentSummary = decrypt(user.contentSummary) || 'No existing history summarized yet.';
    const model = config.openai.model || 'gpt-4o-mini';
    const openai = getOpenAIClient();

    let updatedSummary = '';

    if (!openai) {
      logger.warn('[MemoryService] OpenAI API Key is missing. Simulating memory compaction update (Sandbox).');
      // Simple mock update append for testing / simulation
      updatedSummary = `[Auto-Updated Summary (Sandbox Mode)]\n- Topics covered recently: "${newPostContent.substring(0, 50).replace(/[\r\n]+/g, ' ')}..."\n- Keep variety high and avoid repetitive greetings.`;
    } else {
      const systemInstruction = "You are a Memory Compactor. Given the existing Content Summary and a newly published post, update the concise bulleted summary (max 150 words) of topics covered, tone used, and hooks to avoid in the future.";
      const userPrompt = `Existing Content Summary:\n"""\n${currentSummary}\n"""\n\nNewly Published Post Content:\n"""\n${newPostContent}\n"""`;

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 400,
      });

      updatedSummary = completion.choices[0]?.message?.content?.trim() || currentSummary;
    }

    // 2. Persist updated summary back to the database (Encrypting contentSummary)
    await prisma.user.update({
      where: { id: userId },
      data: { contentSummary: encrypt(updatedSummary) },
    });

    logger.info(`[MemoryService] Successfully updated rolling summary memory for user "${userId}".`);
  } catch (err) {
    logger.error(`[MemoryService] Failed updating rolling summary memory: ${err.message}`);
  }
}
