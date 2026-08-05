'use client';

import React from 'react';
import { Layers, Sparkles, ChevronRight, Bookmark, MessageSquare, Share2 } from 'lucide-react';

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
  const isCover = slideNumber === 1;
  const isCTA = slideNumber === totalSlides && totalSlides > 1;

  // Split content lines into clean bullet items
  const contentLines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-3xl shadow-2xl transition-all duration-300 flex flex-col justify-between p-6 sm:p-8 select-none border border-indigo-500/30 ${
        aspectRatio === '4:5' ? 'aspect-[4/5]' : 'aspect-square'
      }`}
      style={{
        background: isCover
          ? 'radial-gradient(circle at 50% 30%, #1E1B4B 0%, #0F172A 70%, #090D16 100%)'
          : isCTA
          ? 'radial-gradient(circle at 50% 70%, #312E81 0%, #0F172A 60%, #0B0F19 100%)'
          : 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #090D16 100%)',
      }}
    >
      {/* Background Decorative Ambient Glow Orbs */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER: Brand Profile & Slide Badge Counter */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5 shadow-md shadow-indigo-500/30">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-indigo-300 font-extrabold text-xs">
              OS
            </div>
          </div>
          <div>
            <p className="text-xs font-extrabold text-white tracking-wide flex items-center gap-1.5">
              {brandName}
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </p>
            <p className="text-[10px] text-indigo-300/70 font-mono uppercase tracking-widest">
              {isCover ? 'Cover Teardown' : isCTA ? 'Action Takeaway' : 'Slide Insight'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1 rounded-full shadow-inner">
          <span className="text-[11px] font-extrabold text-cyan-300 font-mono">
            {slideNumber}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">/</span>
          <span className="text-[11px] font-bold text-slate-300 font-mono">
            {totalSlides}
          </span>
        </div>
      </div>

      {/* CENTER BODY: Dynamic High-Impact Typography */}
      <div className="relative z-10 flex-1 flex flex-col justify-center py-6 space-y-4">
        {isCover ? (
          /* COVER SLIDE: HUGE BOLD CENTERPIECE TYPOGRAPHY */
          <div className="text-center space-y-4 max-w-md mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[11px] font-bold tracking-wider uppercase shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              Product Case Study
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-200 tracking-tight leading-tight uppercase font-sans drop-shadow-md">
              {title}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed font-sans max-w-xs mx-auto">
              {contentLines[0] || 'Swipe left for full step-by-step breakdown 👇'}
            </p>
          </div>
        ) : isCTA ? (
          /* CTA SLIDE: BIG BOLD ENGAGEMENT CARD */
          <div className="text-center space-y-5 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 mx-auto flex items-center justify-center shadow-lg">
              <Bookmark className="h-6 w-6 text-cyan-300" />
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
              {title || 'Save For Later & Share Your Thoughts!'}
            </h3>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                {content || 'Drop a comment below with your favorite workflow tool! 💬'}
              </p>
            </div>
          </div>
        ) : (
          /* INSIGHT SLIDE: LARGE READABLE TYPOGRAPHY & BULLETS */
          <div className="space-y-4 max-w-md">
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
              {title}
            </h3>

            <div className="space-y-2.5">
              {contentLines.map((line, idx) => (
                <div
                  key={idx}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-3.5 backdrop-blur-md transition-all text-xs text-slate-100 leading-relaxed font-sans flex items-start gap-2.5"
                >
                  <span className="text-cyan-400 font-extrabold text-sm shrink-0">
                    •
                  </span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER: Swipe Indicator & Engagement Badges */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-4 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
        <div className="flex items-center gap-1.5 text-indigo-300">
          <Share2 className="h-3.5 w-3.5" />
          <span>@{brandName.toLowerCase().replace(/\s+/g, '')}</span>
        </div>

        {!isCTA && (
          <div className="flex items-center gap-1 text-cyan-300 font-bold bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full animate-pulse">
            <span>Swipe Left</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
    </div>
  );
}
