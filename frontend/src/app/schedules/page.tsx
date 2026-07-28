'use client';

import React from 'react';
import SchedulingDispatcher from '@/components/SchedulingDispatcher';

export default function SchedulesPage() {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header Row with Title & Quick + Action Button */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-200">
            Auto-Pilot Schedules
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Configure recurring dispatch rules & visual asset mappings.
          </p>
        </div>
      </div>

      {/* Main Scheduling Dispatcher Component */}
      <SchedulingDispatcher />
    </div>
  );
}
