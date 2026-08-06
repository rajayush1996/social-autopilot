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
export class SlideGeneratorService {
  /**
   * Split raw text into individual slide sections
   */
  static parseSlides(text) {
    if (!text || typeof text !== 'string') return ['Social Autopilot'];
    
    // Check if text has explicit slide markers
    const rawBlocks = text.split(/\n(?=(?:Slide \d+:|📌|\d+\.|\w+:))/gi).filter(b => b.trim().length > 0);
    
    if (rawBlocks.length > 1) {
      return rawBlocks.map(b => b.trim()).slice(0, 5); // Max 5 slides
    }

    // Split long text into paragraphs
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    if (paragraphs.length > 1) {
      return paragraphs.slice(0, 5);
    }

    return [text];
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
   * Wrap text into multiple SVG lines for 1080x1080 canvas
   */
  static wrapText(text, maxCharsPerLine = 30) {
    const words = text.split(' ');
    const lines = [];
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
    return lines.slice(0, 12); // Max 12 lines to fit comfortably
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
    const lines = this.wrapText(text);

    // Escape text lines for SVG
    const escapedLines = lines.map(line => this.escapeXml(line));

    // Calculate Y positioning
    const lineHeight = 56;
    const totalTextHeight = escapedLines.length * lineHeight;
    const startY = Math.max(320, (height - totalTextHeight) / 2);

    const tspanMarkup = escapedLines.map((line, idx) => {
      return `<tspan x="100" y="${startY + idx * lineHeight}">${line}</tspan>`;
    }).join('');

    const svgString = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0B0F17"/>
            <stop offset="50%" stop-color="#1E1B4B"/>
            <stop offset="100%" stop-color="#0F172A"/>
          </linearGradient>
          <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#6366F1"/>
            <stop offset="100%" stop-color="#38BDF8"/>
          </linearGradient>
        </defs>

        <!-- Background -->
        <rect width="100%" height="100%" fill="url(#bg)"/>
        
        <!-- Subtle Glow Orbs -->
        <circle cx="180" cy="180" r="260" fill="#6366F1" opacity="0.18" />
        <circle cx="900" cy="900" r="300" fill="#38BDF8" opacity="0.14" />

        <!-- Header Brand Bar -->
        <rect x="80" y="80" width="6" height="40" rx="3" fill="url(#accent)" />
        <text x="104" y="108" fill="#94A3B8" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" letter-spacing="2">
          ${this.escapeXml(brandName.toUpperCase())}
        </text>

        <!-- Slide Index Pill -->
        ${totalSlides > 1 ? `
        <rect x="880" y="80" width="120" height="40" rx="20" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
        <text x="940" y="106" fill="#E2E8F0" font-family="Arial, sans-serif" font-size="18" font-weight="700" text-anchor="middle">
          ${slideIndex} / ${totalSlides}
        </text>
        ` : ''}

        <!-- Main Slide Body Text -->
        <text font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="40" font-weight="600" fill="#F8FAFC">
          ${tspanMarkup}
        </text>

        <!-- Footer Bottom Bar -->
        <line x1="100" y1="960" x2="980" y2="960" stroke="#334155" stroke-width="1.5" />
        <text x="100" y="1005" fill="#64748B" font-family="Arial, sans-serif" font-size="20" font-weight="500">
          Created with OmniSync ✨
        </text>
      </svg>
    `;

    const filename = `slide_${Date.now()}_${slideIndex}.jpg`;

    const imageBuffer = await sharp(Buffer.from(svgString))
      .jpeg({ quality: 92 })
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
