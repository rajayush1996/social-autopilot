'use client';

import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

export function CampaignDayAssetMapper({ 
  totalDays = 15, 
  onImageClick 
}: { 
  totalDays?: number; 
  onImageClick: (url: string, title: string) => void; 
}) {
  const availableAssets = [
    { id: 'img_1', name: 'Product Launch 3D.png', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800' },
    { id: 'img_2', name: 'Analytics Dashboard.jpg', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800' },
    { id: 'img_3', name: 'Team Success Story.jpg', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800' },
  ];

  const [mappings, setMappings] = useState<Array<{ dayNumber: number; selectedImageUrl: string }>>(
    Array.from({ length: totalDays }, (_, i) => ({
      dayNumber: i + 1,
      selectedImageUrl: availableAssets[i % availableAssets.length].url,
    }))
  );

  const handleUpdateMapping = (dayNum: number, newUrl: string) => {
    setMappings(prev => prev.map(m => m.dayNumber === dayNum ? { ...m, selectedImageUrl: newUrl } : m));
  };

  return (
    <div className="space-y-3 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-4 shadow-inner">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#2563EB]" />
          <h4 className="text-xs font-extrabold text-[var(--text-primary)] uppercase tracking-wider">
            Day-by-Day Creative Calendar ({totalDays} Days Mapping)
          </h4>
        </div>
        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
          ✨ Smart Rotation Active
        </span>
      </div>

      <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {mappings.map((item) => (
          <div key={item.dayNumber} className="flex items-center justify-between gap-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-2 shadow-xs">
            <span className="w-14 text-center text-[11px] font-extrabold text-[var(--text-primary)] bg-[var(--bg-input)] py-1 rounded-lg border border-[var(--border-color)]">
              Day {item.dayNumber}
            </span>

            {/* Clickable Thumbnail to Open Lightbox */}
            <div 
              onClick={() => onImageClick(item.selectedImageUrl, `Day ${item.dayNumber} Assigned Creative`)}
              className="w-9 h-9 rounded-lg bg-slate-900 overflow-hidden border border-[var(--border-color)] shrink-0 cursor-pointer hover:border-[#2563EB] relative group"
              title="Click to zoom image"
            >
              <img src={item.selectedImageUrl} alt="Assigned preview" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white">🔍</div>
            </div>

            <div className="flex-1">
              <select
                value={item.selectedImageUrl}
                onChange={(e) => handleUpdateMapping(item.dayNumber, e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-[#2563EB] font-medium truncate"
              >
                {availableAssets.map((asset) => (
                  <option key={asset.id} value={asset.url}>🖼️ {asset.name}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}