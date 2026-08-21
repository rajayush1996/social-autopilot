'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import CONFIG from '@/config';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  subtitleText?: string;
  showVersionBadge?: boolean;
  href?: string;
  className?: string;
  iconOnly?: boolean;
}

export function BrandLogo({
  size = 'md',
  showSubtitle = true,
  subtitleText = 'Social AI',
  showVersionBadge = false,
  href,
  className = '',
  iconOnly = false,
}: BrandLogoProps) {
  const sizeClasses = {
    sm: {
      box: 'w-8 h-8 rounded-lg',
      icon: 'h-4 w-4',
      title: 'text-sm font-extrabold',
      subtitle: 'text-[9px] -mt-0.5',
    },
    md: {
      box: 'w-10 h-10 rounded-xl',
      icon: 'h-5 w-5',
      title: 'text-base font-extrabold',
      subtitle: 'text-xs -mt-1',
    },
    lg: {
      box: 'w-12 h-12 rounded-2xl',
      icon: 'h-6 w-6',
      title: 'text-xl font-black',
      subtitle: 'text-xs mt-0.5',
    },
  };

  const selectedSize = sizeClasses[size];

  const logoContent = (
    <div className={`flex items-center gap-3 group select-none ${className}`}>
      {/* Consistent Gradient Squircle Icon */}
      <div
        className={`${selectedSize.box} bg-gradient-to-tr from-[#2563EB] to-[#0ea5e9] flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform duration-200 shrink-0`}
      >
        <Sparkles className={`${selectedSize.icon} animate-pulse`} />
      </div>

      {!iconOnly && (
        <div className="overflow-hidden">
          <div className="flex items-center gap-2">
            <span
              className={`${selectedSize.title} tracking-tight text-[var(--text-primary)] uppercase leading-tight font-sans`}
            >
              {CONFIG.APP_NAME}
            </span>
            {showVersionBadge && (
              <span className="bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/25 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                v2.0 AI
              </span>
            )}
          </div>
          {showSubtitle && (
            <span className={`${selectedSize.subtitle} text-[var(--text-secondary)] font-medium block font-sans`}>
              {subtitleText}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block cursor-pointer">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}

export default BrandLogo;
