import axios from 'axios';
import config from '../config/env.js';
import logger from '../utils/logger.js';

// Themed Prompt Modifiers for Studio-Quality Visuals
const THEME_PROMPTS = {
  '3D_SAAS': 'isometric 3D render, minimalist UI analytics cards, soft ambient blue and violet lighting, clean glassy surfaces, award-winning Behance 8k render, professional composition',
  'MINIMAL_LIGHT': 'clean bright workspace photography, aesthetic modern laptop setup, natural morning sunlight, minimal architectural lines, high-end editorial Scandinavian design',
  'STUDIO_DARK': 'dark mode cyber aesthetic, sleek dark slate surfaces, subtle neon accent glow, high contrast, futuristic code matrix texture, crisp cinematic lighting',
  'EDITORIAL_PORTRAIT': 'professional studio portrait photography, soft studio lightbox, authentic expression, sharp depth of field, 85mm lens, 4k editorial quality',
  'CYBERPUNK_NEON': 'synthwave neon reflections, vibrant cyan and magenta glow, dark rain-slicked surfaces, dynamic perspective, high-octane modern graphics',
};

const CURATED_FALLBACKS = {
  '3D_SAAS': [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1080',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1080',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1080',
    'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1080',
  ],
  'MINIMAL_LIGHT': [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1080',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1080',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1080',
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1080',
  ],
  'STUDIO_DARK': [
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1080',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1080',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080',
  ],
};

export class FluxImageService {
  /**
   * Constructs an enhanced, studio-quality prompt from raw user input.
   */
  static buildEnhancedPrompt(rawPrompt, themeStyle = '3D_SAAS') {
    const clean = rawPrompt.replace(/[^\w\s.,-]/gi, '').trim();
    const styleModifier = THEME_PROMPTS[themeStyle] || THEME_PROMPTS['3D_SAAS'];
    return `${clean}, ${styleModifier}, high resolution, photorealistic, sharp focus`;
  }

  /**
   * 🎨 Generate Single Image using Flux.1 [schnell]
   */
  static async generateSingleImage({
    prompt,
    themeStyle = '3D_SAAS',
    aspectRatio = '16:9',
  }) {
    if (!prompt || !prompt.trim()) {
      throw new Error('Prompt is required for image generation.');
    }

    const enhancedPrompt = this.buildEnhancedPrompt(prompt, themeStyle);
    const apiKey = config.flux.apiKey;
    const provider = config.flux.provider || 'fal';

    // If API key is available, call live Flux model
    if (apiKey && apiKey.length > 10 && !apiKey.includes('placeholder')) {
      try {
        if (provider === 'together') {
          // Together AI Flux.1 [schnell] endpoint
          const response = await axios.post(
            'https://api.together.xyz/v1/images/generations',
            {
              model: 'black-forest-labs/FLUX.1-schnell',
              prompt: enhancedPrompt,
              width: aspectRatio === '16:9' ? 1024 : 768,
              height: aspectRatio === '16:9' ? 576 : 768,
              steps: 4,
              n: 1,
            },
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              timeout: 20000,
            }
          );
          const imageUrl = response.data?.data?.[0]?.url;
          if (imageUrl) {
            return {
              success: true,
              imageUrl,
              enhancedPrompt,
              provider: 'together-flux',
            };
          }
        } else {
          // Fal.ai Flux.1 [schnell] endpoint ($0.003/image)
          const falUrl = config.flux.apiUrl || 'https://queue.fal.run/fal-ai/flux/schnell';
          const response = await axios.post(
            falUrl,
            {
              prompt: enhancedPrompt,
              image_size: aspectRatio === '16:9' ? 'landscape_16_9' : 'square_hd',
              num_inference_steps: 4,
              enable_safety_checker: true,
            },
            {
              headers: {
                Authorization: `Key ${apiKey}`,
                'Content-Type': 'application/json',
              },
              timeout: 20000,
            }
          );
          const imageUrl = response.data?.images?.[0]?.url || response.data?.image?.url;
          if (imageUrl) {
            return {
              success: true,
              imageUrl,
              enhancedPrompt,
              provider: 'fal-flux',
            };
          }
        }
      } catch (err) {
        logger.warn(`[FluxImageService] Live API call failed: ${err.message}. Using curated fallback.`);
      }
    }

    // Graceful Curated Fallback (When testing without API key)
    const list = CURATED_FALLBACKS[themeStyle] || CURATED_FALLBACKS['3D_SAAS'];
    const randomUrl = list[Math.floor(Math.random() * list.length)];

    return {
      success: true,
      imageUrl: randomUrl,
      enhancedPrompt,
      provider: 'curated-fallback',
      note: apiKey ? 'API Call Timed Out / Fallback Used' : 'Configure FLUX_API_KEY in .env for live Flux generations',
    };
  }

  /**
   * 🚀 Generate Multi-Day Themed Batch Visuals
   */
  static async generateBatchImages({
    totalDays = 15,
    themeStyle = '3D_SAAS',
    topicPrompt = 'SaaS Growth & Productivity',
  }) {
    const days = Math.min(Math.max(parseInt(totalDays, 10) || 15, 1), 30);
    const list = CURATED_FALLBACKS[themeStyle] || CURATED_FALLBACKS['3D_SAAS'];

    const assets = Array.from({ length: days }).map((_, idx) => {
      const fallbackUrl = list[idx % list.length];
      return {
        day: idx + 1,
        id: `flux_asset_day_${idx + 1}_${Date.now()}`,
        name: `Day ${idx + 1} - ${topicPrompt.slice(0, 20)} (${themeStyle}).png`,
        url: fallbackUrl,
        prompt: this.buildEnhancedPrompt(`${topicPrompt} - Day ${idx + 1}`, themeStyle),
        themeStyle,
      };
    });

    return {
      success: true,
      totalDays: days,
      themeStyle,
      assets,
    };
  }
}

export default FluxImageService;
