'use client';

import React from 'react';
import SchedulingDispatcher from '@/components/SchedulingDispatcher';

export default function SchedulesPage() {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-200">
          Scheduling Dispatcher
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Set up alarm-style recurring automation dispatches for social media posting across your active channels.
        </p>
      </div>

      {/* Main Scheduling Dispatcher Component */}
      <SchedulingDispatcher />
    </div>
  );
}
