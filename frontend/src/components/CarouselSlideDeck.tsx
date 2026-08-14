'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Check, FileText, Layers, Eye } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import CarouselGraphicSlide from './CarouselGraphicSlide';

interface CarouselSlideDeckProps {
  text: string;
  onTextChange?: (newText: string) => void;
  platformLabel?: string;
}

interface ParsedSlide {
  slideNumber: number;
  title: string;
  content: string;
}

export function parseCarouselSlides(rawText: string): ParsedSlide[] {
  if (!rawText || !rawText.trim()) return [];

  // Match Slide blocks like "SLIDE 1: Title", "Slide 1: Title", "Slide 1 - Title", "Slide 1", "Slide 1 of 5", or "1. Title"
  const slideBlocks = rawText.split(/(?=(?:SLIDE|Slide|slide|\bSlide\b)\s*\d+[\s:\-–—|]*)/gi).filter((b) => b.trim());

  if (slideBlocks.length <= 1) {
    // Fallback: check for numbered list like "1. ... \n\n 2. ... \n\n 3. ..."
    const numberedBlocks = rawText.split(/(?=\n\s*\d+\.\s+)/gi).filter((b) => b.trim());
    if (numberedBlocks.length > 1) {
      return numberedBlocks.map((block, idx) => {
        const lines = block.trim().split('\n');
        const title = lines[0].replace(/^\d+\.\s*/, '').trim();
        const content = lines.slice(1).join('\n').trim() || title;
        return {
          slideNumber: idx + 1,
          title: title || `Point ${idx + 1}`,
          content: content,
        };
      });
    }

    // Fallback: double newline paragraphs
    const paragraphs = rawText.split(/\n\n+/).filter((p) => p.trim());
    if (paragraphs.length > 1) {
      return paragraphs.map((p, idx) => {
        const lines = p.trim().split('\n');
        return {
          slideNumber: idx + 1,
          title: idx === 0 ? 'Cover Insight' : idx === paragraphs.length - 1 ? 'Action Takeaway' : lines[0].slice(0, 40) || `Slide ${idx + 1}`,
          content: lines.length > 1 ? lines.slice(1).join('\n').trim() : lines[0],
        };
      });
    }
    return [{ slideNumber: 1, title: 'Single Slide Overview', content: rawText.trim() }];
  }

  return slideBlocks.map((block, idx) => {
    const firstLineEnd = block.indexOf('\n');
    let title = `Slide ${idx + 1}`;
    let content = block.trim();

    if (firstLineEnd !== -1) {
      const headerLine = block.slice(0, firstLineEnd).trim();
      title = headerLine.replace(/^(?:SLIDE|Slide|slide|\bSlide\b)\s*\d+[\s:\-–—|]*/i, '').trim() || `Slide ${idx + 1}`;
      content = block.slice(firstLineEnd).trim();
    } else {
      title = block.replace(/^(?:SLIDE|Slide|slide|\bSlide\b)\s*\d+[\s:\-–—|]*/i, '').trim() || `Slide ${idx + 1}`;
      content = title;
    }

    return {
      slideNumber: idx + 1,
      title: title || (idx === 0 ? 'Cover Slide' : `Slide ${idx + 1}`),
      content: content || block.trim(),
    };
  });
}

export default function CarouselSlideDeck({ text, onTextChange, platformLabel = 'Post' }: CarouselSlideDeckProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showRawEditor, setShowRawEditor] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const toast = useToast();

  const slides = parseCarouselSlides(text);
  const totalSlides = slides.length;
  const safeIndex = Math.min(currentSlideIndex, totalSlides - 1 >= 0 ? totalSlides - 1 : 0);
  const activeSlide = slides[safeIndex] || { slideNumber: 1, title: 'Slide 1', content: text };

  const handleNext = () => {
    if (safeIndex < totalSlides - 1) {
      setCurrentSlideIndex(safeIndex + 1);
    }
  };

  const handlePrev = () => {
    if (safeIndex > 0) {
      setCurrentSlideIndex(safeIndex - 1);
    }
  };

  const handleCopySlide = (slideText: string, index: number) => {
    navigator.clipboard.writeText(slideText);
    setCopiedIndex(index);
    toast.success(`Copied Slide ${index + 1} to clipboard!`);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!text || !text.trim()) {
    return (
      <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-6 text-center text-[var(--text-secondary)] text-xs font-medium">
        No carousel content generated yet. Write or generate slide content above.
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Top Header & Mode Toggle */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#2563EB]" />
          <span className="text-xs font-extrabold text-[var(--text-primary)] uppercase tracking-wider">
            Interactive Carousel Deck
          </span>
          <span className="text-[10px] font-extrabold bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20 px-2.5 py-0.5 rounded-full">
            {totalSlides} {totalSlides === 1 ? 'Slide' : 'Slides'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowRawEditor(!showRawEditor)}
          className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-input)] border border-[var(--border-color)] px-2.5 py-1 rounded-xl transition-all cursor-pointer"
        >
          {showRawEditor ? (
            <>
              <Eye className="h-3 w-3 text-[#2563EB]" />
              <span>View Carousel Studio</span>
            </>
          ) : (
            <>
              <FileText className="h-3 w-3 text-[var(--text-secondary)]" />
              <span>Edit Raw Text</span>
            </>
          )}
        </button>
      </div>

      {showRawEditor ? (
        /* Raw Text Area Mode */
        <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-4">
          <textarea
            value={text}
            onChange={(e) => onTextChange?.(e.target.value)}
            rows={10}
            className="w-full bg-transparent border-none p-0 text-xs text-[var(--text-primary)] focus:outline-none leading-relaxed resize-y font-sans"
            placeholder="Type or format your slide content here..."
          />
        </div>
      ) : (
        /* Interactive Visual Slide Deck Card Studio */
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 relative">
          {/* Quick Slide Picker Ribbon */}
          {totalSlides > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {slides.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer border ${
                    safeIndex === idx
                      ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs'
                      : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[#2563EB]/40 hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>{idx === 0 ? '1. Cover' : idx === totalSlides - 1 ? `${idx + 1}. CTA` : `${idx + 1}. Slide`}</span>
                </button>
              ))}
            </div>
          )}

          {/* Main Graphic Slide Card Box */}
          <div className="w-full max-w-lg mx-auto">
            <CarouselGraphicSlide
              slideNumber={activeSlide.slideNumber}
              totalSlides={totalSlides}
              title={activeSlide.title}
              content={activeSlide.content}
              brandName={platformLabel ? `${platformLabel}` : 'OmniSync AI'}
            />
          </div>

          {/* Bottom Slide Deck Navigation Controls & Dots */}
          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-color)]/60">
            <button
              type="button"
              onClick={handlePrev}
              disabled={safeIndex === 0}
              className="p-2 bg-[var(--bg-input)] hover:bg-[#2563EB] text-[var(--text-primary)] hover:text-white rounded-xl border border-[var(--border-color)] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
              title="Previous Slide"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Slide Navigation Dots & Indicator */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-[var(--text-secondary)] font-mono">
                Slide <span className="text-[#2563EB]">{safeIndex + 1}</span> of {totalSlides}
              </span>
              <div className="flex items-center gap-1">
                {slides.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      safeIndex === idx
                        ? 'w-5 bg-[#2563EB] shadow-sm'
                        : 'w-2 bg-[var(--border-color)] hover:bg-[var(--text-secondary)]'
                    }`}
                    title={`Go to Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopySlide(`${activeSlide.title}\n\n${activeSlide.content}`, safeIndex)}
                className="flex items-center gap-1 text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-input)] border border-[var(--border-color)] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs"
                title="Copy current slide text"
              >
                {copiedIndex === safeIndex ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Slide</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={safeIndex === totalSlides - 1}
                className="p-2 bg-[var(--bg-input)] hover:bg-[#2563EB] text-[var(--text-primary)] hover:text-white rounded-xl border border-[var(--border-color)] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
                title="Next Slide"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
