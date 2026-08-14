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
   * Generate sleek 1080x1080 Instagram Slide Image JPEG for a given slide text
   */
  static async generateSlideImage({ text, slideIndex = 1, totalSlides = 1, brandName = 'OmniSync' }) {
    const width = 1080;
    const height = 1080;
    const rawLines = this.wrapText(text, 34);

    // Escape text lines for SVG
    const escapedLines = rawLines.map(line => this.escapeXml(line));

    // Calculate Y positioning to center content vertically
    const lineHeight = 58;
    const totalTextHeight = escapedLines.length * lineHeight;
    const startY = Math.max(260, Math.round((height - totalTextHeight) / 2));

    const textLinesSvg = escapedLines.map((line, idx) => {
      if (!line) return '';
      return `<text x="120" y="${startY + idx * lineHeight}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="40" font-weight="600" fill="#F8FAFC">${line}</text>`;
    }).filter(Boolean).join('\n');

    const svgString = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0B0F17"/>
            <stop offset="50%" stop-color="#1E1B4B"/>
            <stop offset="100%" stop-color="#0F172A"/>
          </linearGradient>
          <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#2563EB"/>
            <stop offset="100%" stop-color="#38BDF8"/>
          </linearGradient>
        </defs>

        <!-- Background -->
        <rect width="100%" height="100%" fill="url(#bg)"/>
        
        <!-- Subtle Glow Orbs -->
        <circle cx="180" cy="180" r="260" fill="#2563EB" opacity="0.22" />
        <circle cx="900" cy="900" r="300" fill="#38BDF8" opacity="0.16" />

        <!-- Header Brand Bar -->
        <rect x="120" y="90" width="6" height="40" rx="3" fill="url(#accent)" />
        <text x="144" y="118" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="700" letter-spacing="2">
          ${this.escapeXml(brandName.toUpperCase())}
        </text>

        <!-- Slide Index Pill -->
        ${totalSlides > 1 ? `
        <rect x="840" y="90" width="120" height="40" rx="20" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
        <text x="900" y="116" fill="#E2E8F0" font-family="-apple-system, sans-serif" font-size="18" font-weight="700" text-anchor="middle">
          ${slideIndex} / ${totalSlides}
        </text>
        ` : ''}

        <!-- Main Slide Body Text with 120px Left Padding -->
        ${textLinesSvg}

        <!-- Footer Bottom Bar -->
        <line x1="120" y1="960" x2="960" y2="960" stroke="#334155" stroke-width="1.5" />
        <text x="120" y="1005" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="500">
          Created with OmniSync ✨
        </text>
      </svg>
    `;

    const filename = `slide_${Date.now()}_${slideIndex}.jpg`;

    const imageBuffer = await sharp(Buffer.from(svgString))
      .jpeg({ quality: 95 })
      .toBuffer();

    // Auto-upload generated slide image to Cloudflare R2 / Cloudinary public CDN so Meta API receives a real public HTTPS URL
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
