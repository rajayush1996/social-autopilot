'use client';

import React from 'react';
import SchedulingDispatcher from '@/components/SchedulingDispatcher';

export default function SchedulesPage() {
  return (
    <div className="space-y-6 sm:space-y-8 pb-12 animate-fadeIn w-full max-w-full 2xl:max-w-[1600px] mx-auto">
      {/* Page Header Row with Title & Quick + Action Button */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Auto-Pilot Schedules
          </h1>
          <p className="text-[var(--text-secondary)] text-xs sm:text-sm mt-0.5 font-medium">
            Configure recurring dispatch rules & visual asset mappings.
          </p>
        </div>
      </div>

      {/* Main Scheduling Dispatcher Component */}
      <SchedulingDispatcher />
    </div>
  );
}
