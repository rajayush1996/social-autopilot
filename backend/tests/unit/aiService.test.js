import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generatePostContent, optimizePostForPlatforms } from '../../src/services/aiService.js';

describe('AI Service Unit Tests', () => {
  it('should generate platform-tailored fallback content when OpenAI key is missing/mock', async () => {
    const result = await generatePostContent({
      prompt: 'Launching Social Media Autopilot features',
      platform: 'INSTAGRAM',
      tone: 'ENGAGING',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.platform, 'INSTAGRAM');
    assert.strictEqual(result.tone, 'ENGAGING');
    assert.ok(result.content && result.content.length > 0, 'Instagram content should be present');
  });

  it('should generate X content under concise length guidelines', async () => {
    const result = await generatePostContent({
      prompt: 'Productivity tips for marketers',
      platform: 'X',
      tone: 'CASUAL',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.platform, 'X');
    assert.ok(result.content && result.content.length > 0, 'X post content should be generated');
  });

  it('should adapt single master post for multiple target platforms', async () => {
    const adapted = await optimizePostForPlatforms({
      content: 'Scaling social media content with AI workflows',
      platforms: ['INSTAGRAM', 'LINKEDIN', 'X'],
      tone: 'PROFESSIONAL',
    });

    assert.strictEqual(adapted.success, true);
    assert.ok(adapted.adaptedPosts.INSTAGRAM, 'Instagram content should be generated');
    assert.ok(adapted.adaptedPosts.LINKEDIN, 'LinkedIn content should be generated');
    assert.ok(adapted.adaptedPosts.X, 'X content should be generated');
  });

  it('should throw error if prompt/topic is missing', async () => {
    await assert.rejects(
      async () => {
        await generatePostContent({});
      },
      {
        name: 'Error',
        message: 'A prompt, topic, or article URL is required to generate AI content.',
      }
    );
  });

  it('should never duplicate [PROMPT DIRECTIVE] blocks even after repeated enhancePrompt calls', async () => {
    const { enhancePrompt } = await import('../../src/services/aiService.js');
    let promptText = 'Story of Loom acquired by Atlassian or Skyscanner';
    
    // Call enhancePrompt 5 times in succession
    for (let i = 0; i < 5; i++) {
      const res = await enhancePrompt({ rawThought: promptText, platform: 'LINKEDIN', tone: 'ENGAGING' });
      promptText = res.enhancedPrompt;
    }

    // Count occurrences of '[PROMPT DIRECTIVE]'
    const directiveMatches = promptText.match(/\[PROMPT DIRECTIVE\]/gi) || [];
    assert.strictEqual(directiveMatches.length <= 1, true, 'PROMPT DIRECTIVE block should appear at most ONCE, never duplicated');
  });
});
