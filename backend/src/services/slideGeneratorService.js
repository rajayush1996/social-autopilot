import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';
import logger from '../utils/logger.js';
import { UploadStrategyFactory } from './upload/uploadStrategyFactory.js';

/**
 * Enterprise Slide Image Generator Service.
 * Converts raw text or slide decks into high-res (1080x1080) Instagram-ready graphic slide images.
 */
/**
 * Enterprise Slide Image Generator Service.
 * Converts raw text or slide decks into high-res (1080x1080) Instagram-ready graphic slide images.
 */
export class SlideGeneratorService {
  /**
   * Normalize Mathematical Unicode Bold / Italic characters into clean ASCII characters for graphic rendering
   */
  static normalizeUnicodeForGraphic(text) {
    if (!text) return '';
    return text
      // Math Bold / Sans-serif bold uppercase: 𝗔-𝗭 (0x1D5D4 - 0x1D5ED) -> A-Z
      .replace(/[\uD835][\uDDD4-\uDDED]/g, (char) => {
        const code = char.codePointAt(0);
        return String.fromCharCode(code - 0x1D5D4 + 65);
      })
      // Math Bold / Sans-serif bold lowercase: 𝗮-𝘇 (0x1D5EE - 0x1D607) -> a-z
      .replace(/[\uD835][\uDDEE-\uDE07]/g, (char) => {
        const code = char.codePointAt(0);
        return String.fromCharCode(code - 0x1D5EE + 97);
      })
      // Math Bold digits: 𝟬-𝟵 (0x1D7CE - 0x1D7D7) -> 0-9
      .replace(/[\uD835][\uDFCE-\uDFD7]/g, (char) => {
        const code = char.codePointAt(0);
        return String.fromCharCode(code - 0x1D7CE + 48);
      });
  }

  /**
   * Split raw text into individual slide sections
   */
  static parseSlides(text) {
    if (!text || typeof text !== 'string') return ['Social Autopilot'];

    // Clean JSON wrapper if string starts with JSON
    let cleanText = text.trim();
    if (cleanText.startsWith('{')) {
      try {
        const parsed = JSON.parse(cleanText);
        cleanText = parsed.INSTAGRAM || parsed.LINKEDIN || parsed.content || cleanText;
      } catch (e) {}
    }

    // Strip trailing hashtags for visual slide cards
    const withoutHashtags = cleanText.replace(/#[a-zA-Z0-9_]+\s*/g, '').trim();

    // Check for explicit slide markers (e.g. Slide 1:, Slide 2:)
    const explicitSlideBlocks = withoutHashtags.split(/\n(?=(?:SLIDE|Slide|slide)\s*\d+[\s:\-–—|]*)/gi).map(s => s.trim()).filter(Boolean);
    if (explicitSlideBlocks.length > 1) {
      return explicitSlideBlocks.slice(0, 7);
    }

    // Check for structured sections (📌, Key Takeaways, numbered points, paragraphs)
    const sectionBlocks = withoutHashtags.split(/\n\s*\n/).map(b => b.trim()).filter(b => b.length > 10);
    if (sectionBlocks.length > 1) {
      // Group small paragraphs together so we have 2 to 5 rich slides
      const groupedSlides = [];
      let currentBuffer = '';

      for (const block of sectionBlocks) {
        if (!currentBuffer) {
          currentBuffer = block;
        } else if ((currentBuffer + '\n\n' + block).length < 240) {
          currentBuffer += '\n\n' + block;
        } else {
          groupedSlides.push(currentBuffer);
          currentBuffer = block;
        }
      }
      if (currentBuffer) groupedSlides.push(currentBuffer);

      return groupedSlides.slice(0, 6);
    }

    return [withoutHashtags];
  }

  /**
   * Generate full carousel slide deck of 1080x1080 graphic images for multi-paragraph or multi-slide text
   */
  static async generateSlideDeck({ text, brandName = 'OmniSync' }) {
    const slideTexts = this.parseSlides(text);
    const totalSlides = slideTexts.length;
    const slideUrls = [];

    for (let i = 0; i < totalSlides; i++) {
      const url = await this.generateSlideImage({
        text: slideTexts[i],
        slideIndex: i + 1,
        totalSlides,
        brandName,
      });
      slideUrls.push(url);
    }
    return slideUrls;
  }

  /**
   * Wrap text into multiple SVG lines for 1080x1080 canvas (32 chars max per line)
   */
  static wrapText(text, maxCharsPerLine = 32) {
    const clean = this.normalizeUnicodeForGraphic(text);
    const paragraphs = clean.split(/\n+/);
    const lines = [];

    for (const para of paragraphs) {
      const words = para.trim().split(/\s+/);
      let currentLine = '';

      for (const word of words) {
        if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
          currentLine = (currentLine + ' ' + word).trim();
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
      // Small spacing line between paragraphs if multiple
      if (paragraphs.length > 1 && lines.length < 10) {
        lines.push('');
      }
    }

    // Filter out trailing blank lines and limit to 10 lines
    while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
    return lines.slice(0, 10);
  }

  /**
   * Escape XML special characters for SVG text rendering
   */
  static escapeXml(unsafe) {
    return (unsafe || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Generate sleek, modern 1080x1080 graphic slide matching frontend CarouselGraphicSlide
   */
  static async generateSlideImage({ text, slideIndex = 1, totalSlides = 1, brandName = 'OmniSync AI' }) {
    const width = 1080;
    const height = 1080;
    const isCover = slideIndex === 1;
    const isCTA = slideIndex === totalSlides && totalSlides > 1;

    const cleanText = this.normalizeUnicodeForGraphic(text).trim();
    const rawLines = cleanText.split(/\n+/).map(l => l.trim()).filter(Boolean);

    let centerContentSvg = '';

    if (isCover) {
      // 1. COVER SLIDE: Perfectly Centered Typography with Glow Badge & Swipe Indicator
      const coverTitle = rawLines[0] || 'Strategic Breakdown';
      const coverSubtitle = rawLines.slice(1).join(' ') || 'Swipe left for the full step-by-step breakdown 👇';
      
      const wrappedTitleLines = this.wrapText(coverTitle, 26).map(l => this.escapeXml(l));
      const wrappedSubLines = this.wrapText(coverSubtitle, 42).map(l => this.escapeXml(l));

      const titleY = 460 - (wrappedTitleLines.length * 32);
      const titleLinesSvg = wrappedTitleLines.map((l, i) => 
        `<text x="540" y="${titleY + i * 68}" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="-0.5">${l}</text>`
      ).join('\n');

      const subStartY = titleY + (wrappedTitleLines.length * 68) + 40;
      const subLinesSvg = wrappedSubLines.slice(0, 3).map((l, i) => 
        `<text x="540" y="${subStartY + i * 40}" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="500" fill="#94A3B8" text-anchor="middle">${l}</text>`
      ).join('\n');

      centerContentSvg = `
        <!-- Cover Pill Badge -->
        <g transform="translate(370, 240)">
          <rect width="340" height="46" rx="23" fill="#2563EB" fill-opacity="0.18" stroke="#2563EB" stroke-width="1.5"/>
          <circle cx="24" cy="23" r="6" fill="#38BDF8"/>
          <text x="180" y="29" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="800" fill="#60A5FA" text-anchor="middle" letter-spacing="2">CAROUSEL BREAKDOWN</text>
        </g>

        <!-- Centered Hero Title -->
        ${titleLinesSvg}

        <!-- Centered Subtitle -->
        ${subLinesSvg}
      `;
    } else if (isCTA) {
      // 2. CTA SLIDE: Centered Save / Bookmark Card with Action Prompt
      const ctaHeader = rawLines[0] || 'Save For Later & Join The Discussion!';
      const ctaBody = rawLines.slice(1).join(' ') || 'What is your single biggest takeaway? Drop a comment below 👇';

      const wrappedHeader = this.wrapText(ctaHeader, 30).map(l => this.escapeXml(l));
      const wrappedBody = this.wrapText(ctaBody, 38).map(l => this.escapeXml(l));

      const headerSvg = wrappedHeader.map((l, i) => 
        `<text x="540" y="${390 + i * 54}" font-family="system-ui, -apple-system, sans-serif" font-size="42" font-weight="900" fill="#FFFFFF" text-anchor="middle">${l}</text>`
      ).join('\n');

      const bodySvg = wrappedBody.map((l, i) => 
        `<text x="540" y="${580 + i * 42}" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="600" fill="#E2E8F0" text-anchor="middle">${l}</text>`
      ).join('\n');

      centerContentSvg = `
        <!-- Bookmark Icon Box -->
        <g transform="translate(485, 230)">
          <rect width="110" height="110" rx="28" fill="#10B981" fill-opacity="0.15" stroke="#10B981" stroke-width="2"/>
          <path d="M42 32 H68 V78 L55 68 L42 78 Z" fill="#10B981"/>
        </g>

        <!-- Centered Header -->
        ${headerSvg}

        <!-- Discussion Card Box -->
        <rect x="140" y="500" width="800" height="240" rx="24" fill="#1E293B" fill-opacity="0.85" stroke="#334155" stroke-width="2"/>
        ${bodySvg}
      `;
    } else {
      // 3. CONTENT SLIDE: Centered Glassmorphic Cards with Numbered Icon Badges
      const slideTitle = rawLines[0] || `Key Strategy #${slideIndex - 1}`;
      const bulletLines = rawLines.slice(1);
      const cleanBullets = (bulletLines.length > 0 ? bulletLines : [cleanText]).slice(0, 4);

      const headerText = this.escapeXml(slideTitle.slice(0, 48));

      const cardElements = cleanBullets.map((bullet, idx) => {
        const yPos = 310 + idx * 145;
        const cleanBullet = this.escapeXml(bullet.replace(/^[📌🎯💡\s\d\.\:]+/, '').slice(0, 95));
        const wrappedBullet = this.wrapText(cleanBullet, 36);

        const bulletLinesSvg = wrappedBullet.slice(0, 2).map((line, lIdx) => 
          `<text x="210" y="${yPos + 48 + lIdx * 34}" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="600" fill="#F8FAFC">${line}</text>`
        ).join('\n');

        return `
          <g transform="translate(100, ${yPos})">
            <rect width="880" height="120" rx="20" fill="#1E293B" fill-opacity="0.85" stroke="#334155" stroke-width="1.5" />
            <circle cx="55" cy="60" r="22" fill="#2563EB" fill-opacity="0.25" stroke="#2563EB" stroke-width="2" />
            <text x="55" y="67" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="900" fill="#60A5FA" text-anchor="middle">${idx + 1}</text>
            ${bulletLinesSvg}
          </g>
        `;
      }).join('\n');

      centerContentSvg = `
        <!-- Slide Header Title with Blue Dot -->
        <g transform="translate(100, 230)">
          <circle cx="12" cy="18" r="8" fill="#2563EB" />
          <text x="35" y="27" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="900" fill="#FFFFFF" letter-spacing="-0.5">${headerText}</text>
        </g>

        <!-- Centered Card Boxes -->
        ${cardElements}
      `;
    }

    const svgString = `
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
            <feGaussianBlur stdDeviation="70" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Background -->
        <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
        
        <!-- Glowing Accent Orbs -->
        <circle cx="950" cy="150" r="220" fill="#2563EB" fill-opacity="0.18" filter="url(#glow)"/>
        <circle cx="100" cy="950" r="260" fill="#0EA5E9" fill-opacity="0.12" filter="url(#glow)"/>

        <!-- Top Header Bar -->
        <g transform="translate(100, 85)">
          <rect width="36" height="36" rx="10" fill="#2563EB"/>
          <text x="18" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900" fill="#FFFFFF" text-anchor="middle">OS</text>
          <text x="52" y="25" fill="#F8FAFC" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="800" letter-spacing="1">
            ${this.escapeXml(brandName)}
          </text>
        </g>

        <!-- Slide Index Pill -->
        ${totalSlides > 1 ? `
        <g transform="translate(860, 85)">
          <rect width="120" height="38" rx="19" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
          <text x="60" y="24" fill="#E2E8F0" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="800" text-anchor="middle">
            ${slideIndex} / ${totalSlides}
          </text>
        </g>
        ` : ''}

        <!-- Main Body Content -->
        ${centerContentSvg}

        <!-- Bottom Footer Bar -->
        <line x1="100" y1="960" x2="980" y2="960" stroke="#334155" stroke-width="1.5" />
        
        <g transform="translate(100, 990)">
          <text x="0" y="18" fill="#38BDF8" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="800" letter-spacing="1">
            @${this.escapeXml(brandName.toLowerCase().replace(/\s+/g, ''))}
          </text>
          
          ${!isCTA ? `
          <g transform="translate(740, -5)">
            <rect width="140" height="34" rx="17" fill="#2563EB" fill-opacity="0.15" stroke="#2563EB" stroke-width="1.5"/>
            <text x="70" y="22" fill="#60A5FA" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" text-anchor="middle">SWIPE LEFT ➔</text>
          </g>
          ` : `
          <text x="880" y="18" fill="#64748B" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" text-anchor="end">linkedin.com</text>
          `}
        </g>
      </svg>
    `;

    const filename = `slide_${Date.now()}_${slideIndex}.jpg`;

    const imageBuffer = await sharp(Buffer.from(svgString))
      .jpeg({ quality: 95 })
      .toBuffer();

    // Auto-upload generated slide image to Cloudflare R2 / Cloudinary public CDN
    try {
      const uploader = UploadStrategyFactory.getPrimaryConfiguredStrategy();
      if (uploader && uploader.name !== 'LocalStorage') {
        const uploadResult = await uploader.upload(imageBuffer, filename, 'image/jpeg');
        if (uploadResult && uploadResult.fileUrl && uploadResult.fileUrl.startsWith('http')) {
          logger.info(`[SlideGeneratorService] Uploaded slide to public CDN (${uploader.name}): ${uploadResult.fileUrl}`);
          return uploadResult.fileUrl;
        }
      }
    } catch (uploadErr) {
      logger.warn(`[SlideGeneratorService] Cloud upload warning: ${uploadErr.message}`);
    }

    const uploadsDir = path.join(process.cwd(), 'public/uploads/slides');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(filePath, imageBuffer);

    const publicUrl = `${config.frontendUrl || 'http://localhost:5000'}/uploads/slides/${filename}`;
    logger.info(`[SlideGeneratorService] Generated slide image: ${publicUrl}`);
    return publicUrl;
  }
}

export default SlideGeneratorService;

