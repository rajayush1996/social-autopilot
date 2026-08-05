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

  // Match Slide blocks like "SLIDE 1: Title", "Slide 1: Title", "Slide 1 - Title", or "Slide 1"
  const slideRegex = /(?:SLIDE|Slide|slide|\bSlide\b)\s*(\d+)[\s:\-–—]*(.*?)(?=\n|(?:SLIDE|Slide|slide|\bSlide\b)\s*\d+|$)/gi;
  
  // Split text by slide markers
  const slideBlocks = rawText.split(/(?=(?:SLIDE|Slide|slide)\s*\d+[\s:\-–—]*)/gi).filter(b => b.trim());

  if (slideBlocks.length <= 1) {
    // If regex didn't find explicit slide blocks, fallback to double-newline paragraphs as slides
    const paragraphs = rawText.split(/\n\n+/).filter(p => p.trim());
    if (paragraphs.length > 1) {
      return paragraphs.map((p, idx) => ({
        slideNumber: idx + 1,
        title: idx === 0 ? 'Cover Slide' : idx === paragraphs.length - 1 ? 'Call to Action' : `Slide ${idx + 1}`,
        content: p.trim(),
      }));
    }
    return [{ slideNumber: 1, title: 'Single Slide Overview', content: rawText.trim() }];
  }

  return slideBlocks.map((block, idx) => {
    const firstLineEnd = block.indexOf('\n');
    let title = `Slide ${idx + 1}`;
    let content = block.trim();

    if (firstLineEnd !== -1) {
      const headerLine = block.slice(0, firstLineEnd).trim();
      title = headerLine.replace(/^(?:SLIDE|Slide|slide)\s*\d+[\s:\-–—]*/i, '').trim() || `Slide ${idx + 1}`;
      content = block.slice(firstLineEnd).trim();
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
  const activeSlide = slides[currentSlideIndex] || slides[0] || { slideNumber: 1, title: 'Slide 1', content: text };

  const handleNext = () => {
    if (currentSlideIndex < totalSlides - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((prev) => prev - 1);
    }
  };

  const handleCopySlide = (slideText: string, index: number) => {
    navigator.clipboard.writeText(slideText);
    setCopiedIndex(index);
    toast.success(`Copied Slide ${index + 1} text to clipboard!`);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!text || !text.trim()) {
    return (
      <div className="bg-slate-955 border border-slate-850 rounded-2xl p-6 text-center text-slate-500 text-xs">
        No carousel content generated yet.
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Top Header & Mode Toggle */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Interactive Carousel Deck
          </span>
          <span className="text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
            {totalSlides} {totalSlides === 1 ? 'Slide' : 'Slides'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowRawEditor(!showRawEditor)}
          className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-indigo-300 bg-slate-900 hover:bg-slate-850 border border-slate-800 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
        >
          {showRawEditor ? (
            <>
              <Eye className="h-3 w-3 text-indigo-400" />
              View Carousel Studio
            </>
          ) : (
            <>
              <FileText className="h-3 w-3 text-slate-400" />
              Edit Raw Text
            </>
          )}
        </button>
      </div>

      {showRawEditor ? (
        /* Raw Text Area Mode */
        <div className="bg-slate-955 border border-slate-850 rounded-2xl p-4">
          <textarea
            value={text}
            onChange={(e) => onTextChange?.(e.target.value)}
            rows={10}
            className="w-full bg-transparent border-none p-0 text-xs text-slate-200 focus:outline-none leading-relaxed resize-y font-sans"
          />
        </div>
      ) : (
        /* Interactive Visual Slide Deck Card Studio */
        <div className="bg-gradient-to-b from-slate-900 to-slate-955 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
          
          {/* Card Top Banner */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-850/80">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-[11px] font-extrabold text-slate-300 tracking-wide uppercase">
                Slide {activeSlide.slideNumber} of {totalSlides}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleCopySlide(`${activeSlide.title}\n\n${activeSlide.content}`, currentSlideIndex)}
              className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 border border-slate-750 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
            >
              {copiedIndex === currentSlideIndex ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  Copied Slide
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy Slide
                </>
              )}
            </button>
          </div>

          {/* Main Graphic Slide Card Box */}
          <div className="max-w-md mx-auto w-full">
            <CarouselGraphicSlide
              slideNumber={activeSlide.slideNumber}
              totalSlides={totalSlides}
              title={activeSlide.title}
              content={activeSlide.content}
              brandName={platformLabel ? `${platformLabel} Teardown` : 'OmniSync AI'}
            />
          </div>

          {/* Slide Deck Navigation Controls & Dots */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentSlideIndex === 0}
              className="p-2 bg-slate-850 hover:bg-indigo-600/30 text-slate-300 hover:text-white rounded-xl border border-slate-750 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Previous Slide"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Slide Navigation Dots */}
            <div className="flex items-center gap-1.5">
              {slides.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    currentSlideIndex === idx
                      ? 'w-6 bg-indigo-500 shadow-sm shadow-indigo-500/50'
                      : 'w-2 bg-slate-700 hover:bg-slate-500'
                  }`}
                  title={`Go to Slide ${idx + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentSlideIndex === totalSlides - 1}
              className="p-2 bg-slate-850 hover:bg-indigo-600/30 text-slate-300 hover:text-white rounded-xl border border-slate-750 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Next Slide"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
