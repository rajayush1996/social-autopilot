'use client';

import React from 'react';
import { Sparkles, ChevronRight, Bookmark, Share2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface CarouselGraphicSlideProps {
  slideNumber: number;
  totalSlides: number;
  title: string;
  content: string;
  brandName?: string;
  aspectRatio?: '4:5' | '1:1';
}

export default function CarouselGraphicSlide({
  slideNumber,
  totalSlides,
  title,
  content,
  brandName = 'OmniSync AI',
  aspectRatio = '4:5',
}: CarouselGraphicSlideProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isCover = slideNumber === 1;
  const isCTA = slideNumber === totalSlides && totalSlides > 1;

  // Split content lines into clean bullet items
  const contentLines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-3xl shadow-sm transition-all duration-300 flex flex-col justify-between p-6 sm:p-8 select-none border border-[var(--border-color)] ${
        aspectRatio === '4:5' ? 'aspect-[4/5]' : 'aspect-square'
      }`}
      style={{
        background: isLight
          ? isCover
            ? 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 60%, #BFDBFE 100%)'
            : isCTA
            ? 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 60%, #BBF7D0 100%)'
            : 'var(--bg-input)'
          : isCover
          ? 'radial-gradient(circle at 50% 30%, #1E1B4B 0%, #0F172A 70%, #090D16 100%)'
          : isCTA
          ? 'radial-gradient(circle at 50% 70%, #312E81 0%, #0F172A 60%, #0B0F19 100%)'
          : 'var(--bg-input)',
      }}
    >
      {/* Decorative Glow Orbs */}
      <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-40 bg-[#2563EB]/20" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-40 bg-purple-500/20" />

      {/* TOP HEADER */}
      <div className="relative z-10 flex items-center justify-between border-b border-[var(--border-color)] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#2563EB] p-0.5 shadow-sm">
            <div className="w-full h-full bg-[var(--bg-card)] rounded-[10px] flex items-center justify-center text-[#2563EB] font-black text-xs">
              OS
            </div>
          </div>
          <div>
            <p className="text-xs font-black text-[var(--text-primary)] tracking-wide flex items-center gap-1.5">
              {brandName}
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#2563EB] font-extrabold">
              {isCover ? 'Cover Teardown' : isCTA ? 'Action Takeaway' : 'Slide Insight'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm font-mono text-[11px] font-extrabold">
          <span className="text-[#2563EB]">{slideNumber}</span>
          <span className="opacity-40">/</span>
          <span className="opacity-70">{totalSlides}</span>
        </div>
      </div>

      {/* CENTER BODY */}
      <div className="relative z-10 flex-1 flex flex-col justify-center py-6 space-y-4">
        {isCover ? (
          <div className="text-center space-y-4 max-w-md mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-[#2563EB]/30 bg-[#2563EB]/10 text-[#2563EB] text-[11px] font-extrabold tracking-wider uppercase shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-[#2563EB]" />
              Product Case Study
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight leading-tight uppercase font-sans">
              {title}
            </h2>

            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-sans max-w-xs mx-auto font-medium">
              {contentLines[0] || 'Swipe left for full step-by-step breakdown 👇'}
            </p>
          </div>
        ) : isCTA ? (
          <div className="text-center space-y-5 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center shadow-sm">
              <Bookmark className="h-6 w-6 text-emerald-500" />
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight leading-snug">
              {title || 'Save For Later & Share Your Thoughts!'}
            </h3>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 shadow-sm text-[var(--text-primary)]">
              <p className="text-xs leading-relaxed font-sans">
                {content || 'Drop a comment below with your favorite workflow tool! 💬'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-md">
            <h3 className="text-lg sm:text-xl font-black text-[var(--text-primary)] tracking-tight leading-snug flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] shrink-0" />
              {title}
            </h3>

            <div className="space-y-2.5">
              {contentLines.map((line, idx) => (
                <div
                  key={idx}
                  className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-3.5 transition-all text-xs text-[var(--text-primary)] leading-relaxed font-sans flex items-start gap-2.5 shadow-sm"
                >
                  <span className="font-extrabold text-sm text-[#2563EB] shrink-0">
                    •
                  </span>
                  <span className="text-[var(--text-primary)] font-medium">{line}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="relative z-10 flex items-center justify-between border-t border-[var(--border-color)] pt-4 text-[10px] text-[var(--text-secondary)] font-semibold uppercase tracking-wider">
        <div className="flex items-center gap-1.5 text-[#2563EB] font-extrabold">
          <Share2 className="h-3.5 w-3.5" />
          <span>@{brandName.toLowerCase().replace(/\s+/g, '')}</span>
        </div>

        {!isCTA && (
          <div className="flex items-center gap-1 font-extrabold px-3 py-1 rounded-full border border-[#2563EB]/30 bg-[#2563EB]/10 text-[#2563EB]">
            <span>Swipe Left</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
    </div>
  );
}
