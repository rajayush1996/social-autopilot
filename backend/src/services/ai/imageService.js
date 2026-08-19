import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import sharp from 'sharp';
import axios from 'axios';
import config from '../../config/env.js';
import logger from '../../utils/logger.js';

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

export class ImageService {
  /**
   * Generates a sleek, high-contrast branded 1080x1080 SVG/PNG visual card locally using Sharp
   */
  static async generateBrandedGraphicCard({ topic, brandName, hookText, takeaways = [] }) {
    try {
      const cleanTitle = (brandName || topic || 'Product Insight').slice(0, 32);
      const cleanHook = (hookText || 'How simplicity and focused execution redefined an entire market.').slice(0, 110);
      
      const bullets = takeaways.length > 0 
        ? takeaways.slice(0, 3) 
        : [
            '1. DELETE THE BOTTLENECK: Focus strictly on the primary user friction.',
            '2. ZERO-SETUP VELOCITY: Build faster without infrastructure overhead.',
            '3. COMMUNITY AMPLIFICATION: Real-world problems attract organic reach.',
          ];

      const bulletElements = bullets.map((b, i) => {
        const yPos = 580 + i * 110;
        const cleanBullet = b.replace(/^[📌🎯💡\s\d\.\:]+/, '').slice(0, 70);
        return `
          <g transform="translate(100, ${yPos})">
            <rect width="880" height="85" rx="16" fill="#1E293B" fill-opacity="0.8" stroke="#334155" stroke-width="1.5" />
            <circle cx="45" cy="42" r="18" fill="#2563EB" fill-opacity="0.2" stroke="#2563EB" stroke-width="2" />
            <text x="45" y="48" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="900" fill="#60A5FA" text-anchor="middle">${i + 1}</text>
            <text x="85" y="48" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="#F8FAFC">${cleanBullet}</text>
          </g>
        `;
      }).join('\n');

      const svgTemplate = `
      <svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#090D16"/>
            <stop offset="50%" stop-color="#0F172A"/>
            <stop offset="100%" stop-color="#020617"/>
          </linearGradient>
          <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#2563EB"/>
            <stop offset="100%" stop-color="#38BDF8"/>
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="60" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Background -->
        <rect width="1080" height="1080" fill="url(#bgGrad)"/>
        
        <!-- Glowing Accent Orbs -->
        <circle cx="950" cy="150" r="180" fill="#2563EB" fill-opacity="0.15" filter="url(#glow)"/>
        <circle cx="100" cy="950" r="220" fill="#0EA5E9" fill-opacity="0.1" filter="url(#glow)"/>

        <!-- Top Platform Header Pill -->
        <g transform="translate(100, 100)">
          <rect width="240" height="42" rx="21" fill="#2563EB" fill-opacity="0.15" stroke="#2563EB" stroke-width="1.5"/>
          <circle cx="24" cy="21" r="6" fill="#38BDF8"/>
          <text x="42" y="27" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="800" fill="#60A5FA" letter-spacing="1.5">INSIGHT TEARDOWN</text>
        </g>

        <!-- Brand / Case Study Title -->
        <text x="100" y="240" font-family="system-ui, -apple-system, sans-serif" font-size="56" font-weight="900" fill="#FFFFFF" letter-spacing="-0.5">${cleanTitle}</text>

        <!-- Opening Hook Subtext -->
        <foreignObject x="100" y="280" width="880" height="160">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, -apple-system, sans-serif; font-size: 26px; line-height: 1.4; color: #94A3B8; font-weight: 500;">
            ${cleanHook}
          </div>
        </foreignObject>

        <!-- Divider Line -->
        <line x1="100" y1="470" x2="980" y2="470" stroke="#334155" stroke-width="1.5" stroke-dasharray="8 8"/>

        <!-- Core Takeaway Header -->
        <text x="100" y="525" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="800" fill="#64748B" letter-spacing="2">KEY STRATEGIC TAKEAWAYS</text>

        <!-- Bullet Cards -->
        ${bulletElements}

        <!-- Bottom Footer Branding -->
        <g transform="translate(100, 970)">
          <text x="0" y="25" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="800" fill="#38BDF8" letter-spacing="1">OMNISYNC AUTOPILOT</text>
          <text x="880" y="25" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="#64748B" text-anchor="end">linkedin.com</text>
        </g>
      </svg>
      `;

      const uploadDir = path.resolve('public', 'uploads', 'images');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileName = `visual_card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
      const filePath = path.join(uploadDir, fileName);

      await sharp(Buffer.from(svgTemplate))
        .png({ quality: 95 })
        .toFile(filePath);

      const publicUrl = `/uploads/images/${fileName}`;
      logger.info(`[ImageService] 🎨 Generated Branded Infographic Card: ${publicUrl}`);

      return {
        success: true,
        imageUrl: publicUrl,
        provider: 'BRanded_SVG_CARD',
        width: 1080,
        height: 1080,
      };
    } catch (err) {
      logger.error(`[ImageService] Branded graphic generation error: ${err.message}`);
      return null;
    }
  }

  /**
   * Generates ultra-fast, photorealistic 3D visuals using Fal.ai Flux.1 Schnell ($0.003/image cost-optimized)
   */
  static async generateFluxVisual({ topic, brandName, visualSubject, tone = 'ENGAGING' }) {
    const falKey = process.env.FLUX_API_KEY || process.env.FAL_KEY;
    if (!falKey || falKey === 'your_flux_api_key_here' || falKey.includes('placeholder')) {
      return null;
    }

    try {
      const apiUrl = process.env.FLUX_API_URL?.replace('queue.fal.run', 'fal.run') || 'https://fal.run/fal-ai/flux/schnell';
      const subjectToRender = visualSubject || brandName || topic || 'Modern AI Technology';
      const prompt = `Minimalist 3D isometric tech banner illustration representing ${subjectToRender}. Deep indigo and electric cyan glowing accents, dark mode aesthetic, soft studio lighting, clean geometry, ultra-sharp 8k digital art, premium LinkedIn post banner visual. Zero distorted text.`;

      logger.info(`[ImageService] 🚀 Generating visual with Flux.1 Schnell via Fal.ai for subject: "${subjectToRender}"`);
      const startTime = Date.now();

      const response = await axios.post(
        apiUrl,
        {
          prompt,
          image_size: 'square_hd',
          num_inference_steps: 4, // Cost-minimizing 4 steps
          num_images: 1,
          enable_safety_checker: true,
        },
        {
          headers: {
            'Authorization': `Key ${falKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10s strict timeout
        }
      );

      const imageUrl = response.data?.images?.[0]?.url;
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (imageUrl) {
        logger.info(`[ImageService] ✅ Flux Visual generated in ${duration}s! URL: ${imageUrl}`);
        return {
          success: true,
          imageUrl,
          provider: 'FLUX_1_SCHNELL',
          width: 1024,
          height: 1024,
        };
      }
    } catch (err) {
      logger.warn(`[ImageService] Flux generation warning: ${err.response?.data?.detail || err.message}. Falling back to Branded Infographic Card.`);
    }

    return null;
  }

  /**
   * Main High-Level AI Visual Generator with Multi-Tier Strategy (Flux -> DALL-E -> Branded Card)
   */
  static async generatePostVisual({ topic, brandName, content = '', tone = 'ENGAGING' }) {
    // 1. Extract specific post title/subject from content if available!
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const hookText = lines[0] || '';
    
    // Clean emojis, leading symbols & markdown formatting (e.g. "🚀 Replit Agent" -> "Replit Agent")
    const cleanSubject = hookText
      .replace(/^[^\p{L}\p{N}]+/gu, '')
      .replace(/[*_#`]/g, '')
      .split('\n')[0]
      .trim();

    const visualSubject = cleanSubject || brandName || topic || 'Modern Tech Innovation';
    logger.info(`[ImageService] 🪄 Requesting AI Visual Generation for: "${visualSubject}" (Source topic: "${topic}")`);

    const takeaways = lines.filter(l => /(?:📌|🎯|💡|\b\d+\.\s+)/.test(l));

    // 1. First Priority: Fal.ai Flux.1 Schnell (Fastest 0.15s, Ultra-HD, lowest cost: $0.0035)
    const fluxResult = await this.generateFluxVisual({ topic, brandName, visualSubject, tone });
    if (fluxResult && fluxResult.imageUrl) {
      return fluxResult;
    }

    // 2. Second Priority: DALL-E 3 with 12s timeout race
    const openai = getOpenAIClient();
    if (openai) {
      try {
        const prompt = `A sleek, minimalist modern 3D tech graphic illustration representing "${visualSubject}". Clean lighting, isometric dark mode aesthetic, vibrant blue and cyan glowing accents, ultra-high resolution, premium aesthetic for LinkedIn social post banner. No distorted text.`;
        
        const dallePromise = openai.images.generate({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('DALL-E 3 timeout after 12s')), 12000)
        );

        const res = await Promise.race([dallePromise, timeoutPromise]);
        const remoteUrl = res.data[0]?.url;
        if (remoteUrl) {
          logger.info(`[ImageService] DALL-E 3 Visual generated successfully!`);
          return {
            success: true,
            imageUrl: remoteUrl,
            provider: 'DALL-E-3',
          };
        }
      } catch (dalleErr) {
        logger.warn(`[ImageService] DALL-E 3 generation warning: ${dalleErr.message}. Falling back to Branded Infographic Card.`);
      }
    }

    // 3. High-Performance Zero-Cost Branded Graphic Card
    const cardResult = await this.generateBrandedGraphicCard({
      topic,
      brandName,
      hookText,
      takeaways,
    });

    if (cardResult) return cardResult;

    // 4. Fallback placeholder
    return {
      success: true,
      imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1080&auto=format&fit=crop',
      provider: 'FALLBACK_STOCK',
    };
  }
}

export default ImageService;

