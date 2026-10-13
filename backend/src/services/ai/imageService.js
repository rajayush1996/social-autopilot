import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import sharp from 'sharp';
import axios from 'axios';
import config from '../../config/env.js';
import logger from '../../utils/logger.js';
import { extractBrandAndVisualIntentWithAI } from '../../utils/brandExtractor.js';
import { IMAGE_ASPECT_RATIO, IMAGE_DIMENSIONS, IMAGE_PROVIDER } from '../../config/constants.js';

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

const escapeXml = (unsafe) => {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const wrapTextIntoLines = (text, maxCharsPerLine = 26, maxLines = 4) => {
  if (!text) return [];
  const words = text.trim().split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine ? currentLine + ' ' + word : word).length <= maxCharsPerLine) {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }
  return lines;
};

export class ImageService {
  /**
   * Generates a sleek, high-contrast branded 1080x1080 SVG/PNG visual card locally using Sharp
   */
  static async generateBrandedGraphicCard({ topic, brandName, hookText, takeaways = [], aspectRatio = IMAGE_ASPECT_RATIO.SQUARE }) {
    try {
      const is169 = aspectRatio === IMAGE_ASPECT_RATIO.LANDSCAPE;
      const is45 = aspectRatio === IMAGE_ASPECT_RATIO.PORTRAIT;
      const dims = IMAGE_DIMENSIONS[aspectRatio] || IMAGE_DIMENSIONS[IMAGE_ASPECT_RATIO.SQUARE];
      const width = dims.width;
      const height = dims.height;

      const cleanTitle = (brandName || topic || 'Product Insight').slice(0, 32);
      const cleanHook = (hookText || 'How simplicity and focused execution redefined an entire market.').slice(0, 110);
      
      const maxBullets = is169 ? 2 : 3;
      const bullets = (takeaways.length > 0 ? takeaways : [
        '1. DELETE THE BOTTLENECK: Focus strictly on the primary user friction.',
        '2. ZERO-SETUP VELOCITY: Build faster without infrastructure overhead.',
        '3. COMMUNITY AMPLIFICATION: Real-world problems attract organic reach.',
      ]).slice(0, maxBullets);

      const contentWidth = width - 200;
      const startBulletY = is169 ? 340 : (is45 ? 640 : 580);
      const bulletGap = is169 ? 95 : (is45 ? 130 : 110);
      const bulletCardHeight = is169 ? 75 : 85;

      const bulletElements = bullets.map((b, i) => {
        const yPos = startBulletY + i * bulletGap;
        const cleanBullet = b.replace(/^[📌🎯💡\s\d\.\:]+/, '').slice(0, 68);
        return `
          <g transform="translate(100, ${yPos})">
            <rect width="${contentWidth}" height="${bulletCardHeight}" rx="16" fill="#1E293B" fill-opacity="0.8" stroke="#334155" stroke-width="1.5" />
            <circle cx="45" cy="${Math.round(bulletCardHeight / 2)}" r="18" fill="#2563EB" fill-opacity="0.2" stroke="#2563EB" stroke-width="2" />
            <text x="45" y="${Math.round(bulletCardHeight / 2) + 6}" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="900" fill="#60A5FA" text-anchor="middle">${i + 1}</text>
            <text x="85" y="${Math.round(bulletCardHeight / 2) + 6}" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="700" fill="#F8FAFC">${escapeXml(cleanBullet)}</text>
          </g>
        `;
      }).join('\n');

      const pillY = is169 ? 55 : (is45 ? 110 : 100);
      const titleY = is169 ? 145 : (is45 ? 250 : 240);
      const hookY = is169 ? 180 : (is45 ? 290 : 280);
      const hookHeight = is169 ? 90 : 140;
      const dividerY = is169 ? 280 : (is45 ? 510 : 470);
      const sectionY = is169 ? 315 : (is45 ? 565 : 525);
      const footerY = height - 90;

      const svgTemplate = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
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
        <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
        
        <!-- Glowing Accent Orbs -->
        <circle cx="${width - 130}" cy="150" r="180" fill="#2563EB" fill-opacity="0.15" filter="url(#glow)"/>
        <circle cx="100" cy="${height - 130}" r="220" fill="#0EA5E9" fill-opacity="0.1" filter="url(#glow)"/>

        <!-- Top Platform Header Pill -->
        <g transform="translate(100, ${pillY})">
          <rect width="240" height="42" rx="21" fill="#2563EB" fill-opacity="0.15" stroke="#2563EB" stroke-width="1.5"/>
          <circle cx="24" cy="21" r="6" fill="#38BDF8"/>
          <text x="42" y="27" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="800" fill="#60A5FA" letter-spacing="1.5">INSIGHT TEARDOWN</text>
        </g>

        <!-- Brand / Case Study Title -->
        <text x="100" y="${titleY}" font-family="system-ui, -apple-system, sans-serif" font-size="${is169 ? 46 : 56}" font-weight="900" fill="#FFFFFF" letter-spacing="-0.5">${escapeXml(cleanTitle)}</text>

        <!-- Opening Hook Subtext -->
        <foreignObject x="100" y="${hookY}" width="${contentWidth}" height="${hookHeight}">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, -apple-system, sans-serif; font-size: ${is169 ? '21px' : '26px'}; line-height: 1.4; color: #94A3B8; font-weight: 500;">
            ${escapeXml(cleanHook)}
          </div>
        </foreignObject>

        <!-- Divider Line -->
        <line x1="100" y1="${dividerY}" x2="${width - 100}" y2="${dividerY}" stroke="#334155" stroke-width="1.5" stroke-dasharray="8 8"/>

        <!-- Core Takeaway Header -->
        <text x="100" y="${sectionY}" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="800" fill="#64748B" letter-spacing="2">KEY STRATEGIC TAKEAWAYS</text>

        <!-- Bullet Cards -->
        ${bulletElements}

        <!-- Bottom Footer Branding -->
        <g transform="translate(100, ${footerY})">
          <text x="0" y="25" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="800" fill="#38BDF8" letter-spacing="1">OMNISYNC AUTOPILOT</text>
          <text x="${contentWidth}" y="25" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="#64748B" text-anchor="end">${is169 ? 'x.com' : 'linkedin.com'}</text>
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
      logger.info(`[ImageService] 🎨 Generated Branded Infographic Card (${width}x${height} - ${aspectRatio}): ${publicUrl}`);

      return {
        success: true,
        imageUrl: publicUrl,
        provider: IMAGE_PROVIDER.BRANDED_CARD,
        width,
        height,
        aspectRatio,
      };
    } catch (err) {
      logger.error(`[ImageService] Branded graphic generation error: ${err.message}`);
      return null;
    }
  }

  /**
   * Phase 2 & 3: Hybrid Sharp Compositing Engine with Multi-Channel Aspect Ratio Support
   * Downloads clean AI background (Flux or DALL-E) and programmatically composites
   * razor-sharp SVG vector typography on top of the left-side negative space.
   * Supports '1:1' (LinkedIn/Instagram), '16:9' (X/Reddit/Facebook), and '4:5' (Mobile Feed).
   */
  static async compositeBrandedTypographyOverlay({ backgroundImageUrl, heroHook, categoryPill, brandName, aspectRatio = IMAGE_ASPECT_RATIO.SQUARE }) {
    try {
      if (!backgroundImageUrl || !heroHook) return null;

      // 1. Fetch remote image buffer with 8s timeout
      const response = await axios.get(backgroundImageUrl, {
        responseType: 'arraybuffer',
        timeout: 8000,
      });
      const bgBuffer = Buffer.from(response.data);

      const is169 = aspectRatio === IMAGE_ASPECT_RATIO.LANDSCAPE;
      const is45 = aspectRatio === IMAGE_ASPECT_RATIO.PORTRAIT;
      const dims = IMAGE_DIMENSIONS[aspectRatio] || IMAGE_DIMENSIONS[IMAGE_ASPECT_RATIO.SQUARE];
      const width = dims.width;
      const height = dims.height;

      const cleanPill = (categoryPill || 'INSIGHT TEARDOWN').slice(0, 26).toUpperCase();
      const pillWidth = Math.min(360, cleanPill.length * 13 + 52);
      const cleanBrand = (brandName || 'OmniSync').slice(0, 24);
      
      const maxChars = is169 ? 32 : (is45 ? 24 : 26);
      const lines = wrapTextIntoLines(heroHook, maxChars, 4);

      const pillY = is169 ? 70 : (is45 ? 120 : 100);
      const textY = is169 ? 180 : (is45 ? 280 : 260);
      const fontSize = is169 ? 44 : (is45 ? 54 : 50);
      const lineSpacing = is169 ? 56 : (is45 ? 70 : 64);
      const footerY = is169 ? 590 : (is45 ? 1240 : 980);

      const scrimStop50 = is169 ? 55 : (is45 ? 50 : 45);

      // 3. Construct modern SVG vector overlay adapting to format
      const svgOverlay = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="scrim" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#050814" stop-opacity="0.95"/>
            <stop offset="${scrimStop50}%" stop-color="#050814" stop-opacity="0.78"/>
            <stop offset="80%" stop-color="#050814" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="#050814" stop-opacity="0.02"/>
          </linearGradient>
        </defs>

        <!-- Left Scrim for Text Legibility -->
        <rect width="${width}" height="${height}" fill="url(#scrim)"/>

        <!-- Category Tag Pill -->
        <g transform="translate(80, ${pillY})">
          <rect width="${pillWidth}" height="40" rx="20" fill="#1E293B" fill-opacity="0.92" stroke="#3B82F6" stroke-width="1.5"/>
          <circle cx="20" cy="20" r="5" fill="#38BDF8"/>
          <text x="36" y="25" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="900" fill="#60A5FA" letter-spacing="1.5">${escapeXml(cleanPill)}</text>
        </g>

        <!-- Hero Hook Headline -->
        <text x="80" y="${textY}" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="900" fill="#FFFFFF" letter-spacing="-0.8">
          ${lines.map((l, i) => `<tspan x="80" dy="${i === 0 ? 0 : lineSpacing}">${escapeXml(l)}</tspan>`).join('')}
        </text>

        <!-- Accent Underline -->
        <line x1="80" y1="${textY + 12 + lines.length * lineSpacing}" x2="360" y2="${textY + 12 + lines.length * lineSpacing}" stroke="#3B82F6" stroke-width="3" stroke-linecap="round"/>

        <!-- Footer Brand Watermark -->
        <g transform="translate(80, ${footerY})">
          <circle cx="16" cy="16" r="16" fill="#2563EB" fill-opacity="0.3" stroke="#2563EB" stroke-width="1.5"/>
          <text x="16" y="22" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900" fill="#60A5FA" text-anchor="middle">${escapeXml(cleanBrand.charAt(0).toUpperCase())}</text>
          <text x="44" y="22" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="800" fill="#F8FAFC" letter-spacing="0.5">${escapeXml(cleanBrand)}</text>
        </g>
      </svg>
      `;

      // 4. Composite locally via Sharp
      const uploadDir = path.resolve('public', 'uploads', 'images');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileName = `hybrid_visual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
      const filePath = path.join(uploadDir, fileName);

      await sharp(bgBuffer)
        .resize(width, height, { fit: 'cover' })
        .composite([{ input: Buffer.from(svgOverlay), blend: 'over' }])
        .png({ quality: 95 })
        .toFile(filePath);

      const publicUrl = `/uploads/images/${fileName}`;
      logger.info(`[ImageService] 🎨 Composite Hybrid Branded Graphic (${width}x${height} - ${aspectRatio}) saved: ${publicUrl}`);

      return {
        success: true,
        imageUrl: publicUrl,
        provider: IMAGE_PROVIDER.HYBRID_SHARP,
        width,
        height,
        aspectRatio,
      };
    } catch (compErr) {
      logger.warn(`[ImageService] Hybrid compositing fallback: ${compErr.message}`);
      return null;
    }
  }

  /**
   * Generates ultra-fast, photorealistic 3D visuals using Fal.ai Flux.1 Schnell ($0.003/image cost-optimized)
   */
  static async generateFluxVisual({ visualPrompt, visualSubject, aspectRatio = IMAGE_ASPECT_RATIO.SQUARE }) {
    const falKey = process.env.FLUX_API_KEY || process.env.FAL_KEY;
    if (!falKey || falKey === 'your_flux_api_key_here' || falKey.includes('placeholder')) {
      return null;
    }

    try {
      const apiUrl = process.env.FLUX_API_URL?.replace('queue.fal.run', 'fal.run') || 'https://fal.run/fal-ai/flux/schnell';
      const prompt = visualPrompt || `Minimalist 3D tech visual for ${visualSubject || 'Modern Technology'}, featuring official company logo emblem and sleek modern product UI dashboard of ${visualSubject || 'Modern Technology'}, deep indigo and electric cyan glowing neon accents, dark mode studio aesthetic, clean geometry, ultra-sharp 8k digital art, premium social media post banner visual. Zero distorted text.`;

      const imageSize = aspectRatio === IMAGE_ASPECT_RATIO.LANDSCAPE ? 'landscape_16_9' : (aspectRatio === IMAGE_ASPECT_RATIO.PORTRAIT ? 'portrait_4_3' : 'square_hd');

      logger.info(`[ImageService] 🚀 Generating visual with Flux.1 Schnell via Fal.ai for subject: "${visualSubject}" | Size: ${imageSize} | Prompt: "${prompt.slice(0, 80)}..."`);
      const startTime = Date.now();

      const response = await axios.post(
        apiUrl,
        {
          prompt,
          image_size: imageSize,
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
          provider: IMAGE_PROVIDER.FLUX,
          width: aspectRatio === IMAGE_ASPECT_RATIO.LANDSCAPE ? 1200 : 1024,
          height: aspectRatio === IMAGE_ASPECT_RATIO.LANDSCAPE ? 675 : (aspectRatio === IMAGE_ASPECT_RATIO.PORTRAIT ? 1280 : 1024),
          aspectRatio,
        };
      }
    } catch (err) {
      logger.warn(`[ImageService] Flux generation warning: ${err.response?.data?.detail || err.message}. Falling back to DALL-E/Branded Card.`);
    }

    return null;
  }

  /**
   * Main High-Level AI Visual Generator with Multi-Tier Strategy (Flux -> DALL-E -> Branded Card)
   */
  static async generatePostVisual({ topic, brandName, content = '', visualMeta = null, tone = 'ENGAGING', renderTypography = true, aspectRatio = IMAGE_ASPECT_RATIO.SQUARE }) {
    // 1. If visualMeta was already provided from Single-Pass text generation, use it directly (0 EXTRA AI CALLS!)
    const intentMeta = visualMeta || await extractBrandAndVisualIntentWithAI({ content, topic, tone });
    const resolvedBrand = brandName || intentMeta.brandName;
    const visualSubject = resolvedBrand || intentMeta.coreSubject || topic || 'Modern Tech Innovation';
    let visualPrompt = intentMeta.visualPrompt;
    // If topic is an explicit visual prompt written by the user, honor and enrich it directly
    if (topic && topic.trim().length > 15 && !topic.toLowerCase().startsWith('write a') && !topic.toLowerCase().startsWith('create a')) {
      visualPrompt = `${topic.trim()}. High-resolution 8k digital render, clean lighting, professional studio aesthetic. Zero distorted text.`;
    }

    logger.info(`[ImageService] 🪄 Visual Generation Target -> Brand: "${resolvedBrand || 'None'}", Subject: "${visualSubject}", Niche: "${intentMeta.niche}" | Ratio: ${aspectRatio} | Prompt: "${(visualPrompt || '').slice(0, 70)}..."`);

    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const hookText = lines[0] || '';
    const takeaways = lines.filter(l => /(?:📌|🎯|💡|\b\d+\.\s+)/.test(l));

    // 1. First Priority: Fal.ai Flux.1 Schnell (Fastest 0.15s, Ultra-HD, lowest cost: $0.0035)
    const fluxResult = await this.generateFluxVisual({ visualPrompt, visualSubject, aspectRatio });
    if (fluxResult && fluxResult.imageUrl) {
      if (renderTypography && intentMeta?.heroHook) {
        const hybrid = await this.compositeBrandedTypographyOverlay({
          backgroundImageUrl: fluxResult.imageUrl,
          heroHook: intentMeta.heroHook,
          categoryPill: intentMeta.categoryPill,
          brandName: resolvedBrand || visualSubject,
          aspectRatio,
        });
        if (hybrid && hybrid.imageUrl) return hybrid;
      }
      return fluxResult;
    }

    // 2. Second Priority: DALL-E 3 with 12s timeout race
    const openai = getOpenAIClient();
    if (openai) {
      try {
        const dallePrompt = visualPrompt || `A sleek, minimalist modern 3D tech graphic illustration representing "${visualSubject}". Clean lighting, isometric dark mode aesthetic, vibrant blue and cyan glowing accents, ultra-high resolution, premium aesthetic for social post banner. No distorted text.`;
        const dalleSize = aspectRatio === IMAGE_ASPECT_RATIO.LANDSCAPE ? '1792x1024' : (aspectRatio === IMAGE_ASPECT_RATIO.PORTRAIT ? '1024x1792' : '1024x1024');

        const dallePromise = openai.images.generate({
          model: 'dall-e-3',
          prompt: dallePrompt,
          n: 1,
          size: dalleSize,
          quality: 'standard',
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('DALL-E 3 timeout after 12s')), 12000)
        );

        const res = await Promise.race([dallePromise, timeoutPromise]);
        const remoteUrl = res.data[0]?.url;
        if (remoteUrl) {
          logger.info(`[ImageService] DALL-E 3 Visual generated successfully!`);
          if (renderTypography && intentMeta?.heroHook) {
            const hybrid = await this.compositeBrandedTypographyOverlay({
              backgroundImageUrl: remoteUrl,
              heroHook: intentMeta.heroHook,
              categoryPill: intentMeta.categoryPill,
              brandName: resolvedBrand || visualSubject,
              aspectRatio,
            });
            if (hybrid && hybrid.imageUrl) return hybrid;
          }
          return {
            success: true,
            imageUrl: remoteUrl,
            provider: IMAGE_PROVIDER.DALLE,
            aspectRatio,
          };
        }
      } catch (dalleErr) {
        logger.warn(`[ImageService] DALL-E 3 generation warning: ${dalleErr.message}. Falling back to Branded Infographic Card.`);
      }
    }

    // 3. High-Performance Zero-Cost Branded Graphic Card
    const cardResult = await this.generateBrandedGraphicCard({
      topic,
      brandName: resolvedBrand || visualSubject,
      hookText,
      takeaways,
      aspectRatio,
    });

    if (cardResult) return cardResult;

    // 4. Fallback placeholder
    return {
      success: true,
      imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1080&auto=format&fit=crop',
      provider: IMAGE_PROVIDER.FALLBACK_STOCK,
    };
  }
}

export default ImageService;


