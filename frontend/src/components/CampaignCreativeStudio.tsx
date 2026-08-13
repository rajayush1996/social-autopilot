'use client';

import React, { useState } from 'react';
import { Sparkles, RefreshCw, Wand2, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

export function CampaignCreativeStudio({ 
  onImageClick,
  onDurationChange
}: { 
  onImageClick: (url: string, title: string) => void; 
  onDurationChange?: (days: number) => void;
}) {
  const [generationType, setGenerationType] = useState<'SINGLE' | 'BATCH'>('BATCH');
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [visualStyle, setVisualStyle] = useState('3D_SAAS');
  const [selectedDays, setSelectedDays] = useState<number>(15);
  
  const [batchAssets, setBatchAssets] = useState<Array<{ day: number; url: string; prompt: string }>>([
    { day: 1, url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800', prompt: 'SaaS dashboard analytics screen' },
    { day: 2, url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800', prompt: 'Team collaboration in a modern office' },
    { day: 3, url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800', prompt: 'Growth charts going upward' },
  ]);

  const handleGenerate = () => {
    setGeneratingBatch(true);
    // Agar BATCH hai toh background job simulate hogi, agar SINGLE hai toh turant 1 image banegi
    setTimeout(() => {
      setGeneratingBatch(false);
    }, generationType === 'BATCH' ? 3000 : 1500);
  };

  const scrollSlider = (direction: 'left' | 'right') => {
    const container = document.getElementById('creative-slider-container');
    if (container) {
      const scrollAmount = direction === 'left' ? -container.clientWidth : container.clientWidth;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-3 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-4 shadow-inner">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-[#2563EB] rounded-xl">
            <Wand2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-[var(--text-primary)] uppercase tracking-wider">AI Visual Generator</h4>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {generationType === 'BATCH' ? `Background queue for ${selectedDays}-day campaign` : 'Instant single creative generation'}
            </p>
          </div>
        </div>
        
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generatingBatch}
          className="px-3 py-2 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {generatingBatch ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {generatingBatch ? (generationType === 'BATCH' ? 'Queuing Background Job...' : 'Generating...') : (generationType === 'BATCH' ? `Generate ${selectedDays}-Day Batch` : 'Generate Single Image')}
        </button>
      </div>

      {/* 🌟 TOGGLE: Single Image vs Multi-Day Batch */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-color)]/50">
        <div className="flex items-center bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => setGenerationType('SINGLE')}
            className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
              generationType === 'SINGLE' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-[var(--text-secondary)]'
            }`}
          >
            🖼️ Single Image Mode
          </button>
          <button
            type="button"
            onClick={() => setGenerationType('BATCH')}
            className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
              generationType === 'BATCH' ? 'bg-[#2563EB] text-white shadow-xs' : 'text-[var(--text-secondary)]'
            }`}
          >
            ⚡ Multi-Day Campaign Batch
          </button>
        </div>

        {/* Agar Batch mode hai toh duration select karne do */}
        {generationType === 'BATCH' && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Duration:</span>
            {[7, 15, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => { setSelectedDays(d); if (onDurationChange) onDurationChange(d); }}
                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold transition-all border cursor-pointer ${
                  selectedDays === d ? 'bg-blue-50 dark:bg-blue-900/30 text-[#2563EB] border-blue-300' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)]'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Style Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase shrink-0">Style:</span>
        {['3D SaaS Render', 'Clean Corporate', 'Minimalist Vector', 'Cyberpunk Tech'].map((style, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setVisualStyle(style)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border shrink-0 cursor-pointer ${
              visualStyle === style ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)]'
            }`}
          >
            {style}
          </button>
        ))}
      </div>

      {/* Slider Preview (Sirf Batch mode mein dikhega, Single mode mein sirf ek main generated preview box dikhega) */}
      {generationType === 'BATCH' ? (
        <div className="relative group/slider pt-1">
          <button 
            type="button"
            onClick={() => scrollSlider('left')}
            className="absolute -left-3 top-[55%] -translate-y-[50%] z-10 p-2 bg-[var(--bg-card)] hover:bg-[#2563EB] hover:text-white border border-[var(--border-color)] rounded-full text-[var(--text-primary)] shadow-md transition-all cursor-pointer opacity-90 hover:opacity-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            type="button"
            onClick={() => scrollSlider('right')}
            className="absolute -right-3 top-[55%] -translate-y-[50%] z-10 p-2 bg-[var(--bg-card)] hover:bg-[#2563EB] hover:text-white border border-[var(--border-color)] rounded-full text-[var(--text-primary)] shadow-md transition-all cursor-pointer opacity-90 hover:opacity-100"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div 
            id="creative-slider-container"
            className="grid grid-flow-col auto-cols-[calc(33.333%-8px)] gap-3 overflow-x-hidden pb-1 pt-1 px-1 scroll-smooth"
          >
            {batchAssets.map((asset) => (
              <div 
                key={asset.day} 
                onClick={() => onImageClick(asset.url, `Day ${asset.day} Creative`)}
                className="group relative bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-xs cursor-pointer hover:border-[#2563EB] transition-all shrink-0 snap-start"
              >
                <div className="h-28 w-full bg-slate-900 overflow-hidden relative">
                  <img src={asset.url} alt={`Day ${asset.day}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <span className="absolute top-1.5 left-1.5 bg-black/75 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-md">
                    Day {asset.day}
                  </span>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                    🔍 View
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div 
          onClick={() => onImageClick(batchAssets[0].url, 'Single Generated Creative')}
          className="h-32 w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden relative cursor-pointer group flex items-center justify-center"
        >
          <img src={batchAssets[0].url} alt="Single preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
            🔍 Click to preview full screen
          </div>
        </div>
      )}
    </div>
  );
}