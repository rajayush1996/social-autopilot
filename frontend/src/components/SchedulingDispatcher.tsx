'use client';

import React, { useEffect, useState } from 'react';
import { 
  AlarmClock, 
  Calendar, 
  Clock, 
  Plus, 
  Play, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ToggleLeft, 
  ToggleRight, 
  Share2,
  Layers,
  ChevronRight,
  X,
  Zap,
  Info
} from 'lucide-react';
import ApiService, { AutomationSchedule } from '@/services/apiService';
import { useToast } from '@/context/ToastContext';

const DAYS_OF_WEEK = [
  { key: 'MON', label: 'M', full: 'Monday' },
  { key: 'TUE', label: 'T', full: 'Tuesday' },
  { key: 'WED', label: 'W', full: 'Wednesday' },
  { key: 'THU', label: 'T', full: 'Thursday' },
  { key: 'FRI', label: 'F', full: 'Friday' },
  { key: 'SAT', label: 'S', full: 'Saturday' },
  { key: 'SUN', label: 'S', full: 'Sunday' },
];

const PLATFORMS = [
  { id: 'LINKEDIN', label: 'LinkedIn', color: 'bg-blue-600/20 text-blue-400 border-blue-500/30' },
  { id: 'X', label: 'X (Twitter)', color: 'bg-slate-700/30 text-slate-300 border-slate-600/40' },
  { id: 'INSTAGRAM', label: 'Instagram', color: 'bg-pink-600/20 text-pink-400 border-pink-500/30' },
];

const TONES = [
  { id: 'ENGAGING', label: 'Engaging & Viral' },
  { id: 'PROFESSIONAL', label: 'Professional Business' },
  { id: 'CASUAL', label: 'Casual & Friendly' },
  { id: 'PROMOTIONAL', label: 'Product Announcement' },
  { id: 'HUMOROUS', label: 'Humorous & Fun' },
];

export function SchedulingDispatcher() {
  const [schedules, setSchedules] = useState<AutomationSchedule[]>([]);
  const [dispatcherEnabled, setDispatcherEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  
  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<AutomationSchedule | null>(null);

  // Form Fields
  const [formName, setFormName] = useState<string>('Daily Autopilot Dispatch');
  const [formTime, setFormTime] = useState<string>('09:00');
  const [formDays, setFormDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);
  const [formRepeat, setFormRepeat] = useState<string>('WEEKLY');
  const [formPlatforms, setFormPlatforms] = useState<('INSTAGRAM' | 'LINKEDIN' | 'X')[]>(['LINKEDIN', 'X']);
  const [formTone, setFormTone] = useState<string>('ENGAGING');
  const [formTopic, setFormTopic] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const toast = useToast();

  const fetchSchedulesData = async () => {
    try {
      const res = await ApiService.getUserSchedules();
      setDispatcherEnabled(res.dispatcherEnabled);
      setSchedules(res.schedules);
    } catch (err: any) {
      console.error('Failed to load automation schedules:', err);
      toast.error('Failed to fetch scheduling dispatcher settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedulesData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingSchedule(null);
    setFormName('Daily Growth Dispatcher');
    setFormTime('09:00');
    setFormDays(['MON', 'TUE', 'WED', 'THU', 'FRI']);
    setFormRepeat('WEEKLY');
    setFormPlatforms(['LINKEDIN', 'X']);
    setFormTone('ENGAGING');
    setFormTopic('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sched: AutomationSchedule) => {
    setEditingSchedule(sched);
    setFormName(sched.name);
    setFormTime(sched.timeOfDay || '09:00');
    setFormDays(sched.daysOfWeek || ['MON', 'TUE', 'WED', 'THU', 'FRI']);
    setFormRepeat(sched.repeatType || 'WEEKLY');
    setFormPlatforms(sched.targetPlatforms || ['LINKEDIN', 'X']);
    setFormTone(sched.tone || 'ENGAGING');
    setFormTopic(sched.topicPrompt || '');
    setIsModalOpen(true);
  };

  const handleToggleDay = (dayKey: string) => {
    if (formDays.includes(dayKey)) {
      if (formDays.length === 1) {
        toast.error('Select at least one active day.');
        return;
      }
      setFormDays(formDays.filter(d => d !== dayKey));
    } else {
      setFormDays([...formDays, dayKey]);
    }
  };

  const handleTogglePlatform = (platId: 'INSTAGRAM' | 'LINKEDIN' | 'X') => {
    if (formPlatforms.includes(platId)) {
      if (formPlatforms.length === 1) {
        toast.error('Select at least one target platform.');
        return;
      }
      setFormPlatforms(formPlatforms.filter(p => p !== platId));
    } else {
      setFormPlatforms([...formPlatforms, platId]);
    }
  };

  const handleToggleActiveSwitch = async (sched: AutomationSchedule) => {
    setTogglingId(sched.id);
    try {
      const updated = await ApiService.toggleSchedule(sched.id, !sched.isActive);
      setSchedules(prev => prev.map(s => s.id === sched.id ? updated : s));
      toast.success(`Schedule "${sched.name}" ${updated.isActive ? 'enabled' : 'paused'}.`);
    } catch (err: any) {
      console.error('Failed to toggle schedule:', err);
      toast.error('Could not change schedule state.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formName.trim() || 'Daily Auto-Post',
        timeOfDay: formTime,
        daysOfWeek: formDays,
        repeatType: formRepeat,
        targetPlatforms: formPlatforms,
        tone: formTone,
        topicPrompt: formTopic.trim(),
        isActive: editingSchedule ? editingSchedule.isActive : true,
      };

      if (editingSchedule) {
        const updated = await ApiService.updateSchedule(editingSchedule.id, payload);
        setSchedules(prev => prev.map(s => s.id === editingSchedule.id ? updated : s));
        toast.success('Schedule updated successfully!');
      } else {
        const created = await ApiService.createSchedule(payload);
        setSchedules(prev => [created, ...prev]);
        toast.success('New recurring schedule created!');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save schedule:', err);
      toast.error(err.response?.data?.message || 'Failed to save automation schedule.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await ApiService.deleteSchedule(id);
      setSchedules(prev => prev.filter(s => s.id !== id));
      toast.success('Schedule deleted.');
    } catch (err: any) {
      console.error('Failed to delete schedule:', err);
      toast.error('Failed to delete schedule.');
    }
  };

  const handleRunNow = async (sched: AutomationSchedule) => {
    setRunningId(sched.id);
    try {
      const result = await ApiService.runScheduleNow(sched.id);
      toast.success(`Dispatched schedule "${sched.name}"! Post queued.`);
      fetchSchedulesData();
    } catch (err: any) {
      console.error('Failed to trigger schedule:', err);
      toast.error(err.response?.data?.message || 'Failed to trigger schedule dispatch.');
    } finally {
      setRunningId(null);
    }
  };

  // Helper to format time (09:00 -> 9:00 AM)
  const formatTimeDisplay = (time24: string) => {
    if (!time24) return '09:00 AM';
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${period}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Loading Automation Dispatcher...</p>
      </div>
    );
  }

  if (!dispatcherEnabled) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-8 text-center space-y-4 max-w-2xl mx-auto my-6 animate-fadeIn">
        <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
          <Info className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-100">Scheduling Dispatcher Disabled</h3>
        <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
          The Full Automation Scheduling Dispatcher feature is currently turned OFF by system administration. Please contact your admin or check the Admin Control Center to enable master dispatching.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <AlarmClock className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-black text-slate-100">Scheduling Dispatcher</h2>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              System Enabled
            </span>
          </div>
          <p className="text-xs text-slate-400 pl-1">
            Configure automated recurring post schedules with custom days, times, and AI tone presets.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-indigo-950/40 transition-all hover:scale-105 active:scale-95 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Schedule
        </button>
      </div>

      {/* Schedule Cards Grid */}
      {schedules.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-800/60 border-dashed rounded-3xl p-12 text-center space-y-4">
          <div className="w-14 h-14 bg-indigo-950/50 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto border border-indigo-800/40">
            <AlarmClock className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-200">No Recurring Schedules Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create your first schedule to automatically generate and queue AI social media posts on selected days.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            Create Schedule
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {schedules.map((sched) => {
            const isToggling = togglingId === sched.id;
            const isRunning = runningId === sched.id;

            return (
              <div
                key={sched.id}
                className={`group relative bg-slate-900/50 border rounded-3xl p-6 backdrop-blur-md transition-all duration-300 hover:border-slate-750 ${
                  sched.isActive
                    ? 'border-indigo-500/30 shadow-lg shadow-indigo-950/20'
                    : 'border-slate-800/80 opacity-70 hover:opacity-100'
                }`}
              >
                {/* Top Row: Title & Active Toggle */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-100 group-hover:text-indigo-300 transition-colors">
                        {sched.name}
                      </h3>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        sched.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {sched.isActive ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    {sched.topicPrompt && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                        "{sched.topicPrompt}"
                      </p>
                    )}
                  </div>

                  {/* Quick Toggle Switch */}
                  <button
                    onClick={() => handleToggleActiveSwitch(sched)}
                    disabled={isToggling}
                    title={sched.isActive ? 'Pause Schedule' : 'Activate Schedule'}
                    className="focus:outline-none transition-transform active:scale-95 text-indigo-400 disabled:opacity-50"
                  >
                    {sched.isActive ? (
                      <ToggleRight className="h-9 w-9 text-indigo-500" />
                    ) : (
                      <ToggleLeft className="h-9 w-9 text-slate-600" />
                    )}
                  </button>
                </div>

                {/* Digital Clock Display */}
                <div className="bg-slate-955/90 border border-slate-850 rounded-2xl p-4 my-3 flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
                      {formatTimeDisplay(sched.timeOfDay)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      {sched.repeatType} REPEAT
                    </span>
                  </div>

                  <div className="p-2 bg-indigo-950/40 rounded-xl border border-indigo-850/60 text-indigo-400">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>

                {/* Day of Week Selector Badges */}
                <div className="my-4 space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active Dispatch Days</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {DAYS_OF_WEEK.map((d) => {
                      const isActiveDay = sched.daysOfWeek?.includes(d.key);
                      return (
                        <div
                          key={d.key}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                            isActiveDay
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/30'
                              : 'bg-slate-800/40 text-slate-600 border border-slate-800'
                          }`}
                          title={d.full}
                        >
                          {d.label}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Target Platforms & Tone Presets */}
                <div className="flex items-center justify-between border-t border-slate-800/60 pt-4 mt-4">
                  <div className="flex items-center gap-1.5">
                    {sched.targetPlatforms?.map((p) => {
                      const found = PLATFORMS.find(plat => plat.id === p);
                      return (
                        <span
                          key={p}
                          className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-lg border ${
                            found ? found.color : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {p}
                        </span>
                      );
                    })}
                  </div>

                  {/* Actions: Run Now, Edit, Delete */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRunNow(sched)}
                      disabled={isRunning}
                      title="Test Run Schedule Dispatcher Now"
                      className="p-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                      {isRunning ? (
                        <span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(sched)}
                      title="Edit Schedule Settings"
                      className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-xl text-xs transition-all"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteSchedule(sched.id, sched.name)}
                      title="Delete Schedule"
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Footer status line */}
                {sched.lastRunAt && (
                  <div className="mt-3 pt-2 border-t border-slate-850 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Last run: {new Date(sched.lastRunAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT SCHEDULE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-955/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                  <AlarmClock className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-lg text-slate-100">
                  {editingSchedule ? 'Edit Automation Schedule' : 'New Automation Schedule'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-5">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Schedule Title
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Morning Growth Pulse"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Time of Day */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Execution Time (HH:MM)
                  </label>
                  <input
                    type="time"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Repeat Cycle
                  </label>
                  <select
                    value={formRepeat}
                    onChange={(e) => setFormRepeat(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="WEEKLY">Weekly Recurring</option>
                    <option value="DAILY">Daily (All 7 Days)</option>
                    <option value="WEEKDAYS">Weekdays Only (Mon-Fri)</option>
                  </select>
                </div>
              </div>

              {/* Day Selector Pills */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Custom Dispatch Days
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS_OF_WEEK.map((d) => {
                    const isSelected = formDays.includes(d.key);
                    return (
                      <button
                        type="button"
                        key={d.key}
                        onClick={() => handleToggleDay(d.key)}
                        className={`py-2.5 rounded-xl font-bold text-xs transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40 border border-indigo-400'
                            : 'bg-slate-950 text-slate-500 border border-slate-800 hover:text-slate-300'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Platforms */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Target Social Platforms
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PLATFORMS.map((p) => {
                    const isSelected = formPlatforms.includes(p.id as any);
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => handleTogglePlatform(p.id as any)}
                        className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 border ${
                          isSelected
                            ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500 shadow-md'
                            : 'bg-slate-950 text-slate-500 border border-slate-800'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />}
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AI Tone & Prompt */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    AI Writing Tone
                  </label>
                  <select
                    value={formTone}
                    onChange={(e) => setFormTone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-all"
                  >
                    {TONES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Custom Topic / Brand Instructions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    placeholder="e.g. Focus on AI software updates, SaaS tips, and startup growth strategy."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      {editingSchedule ? 'Save Changes' : 'Create Schedule'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SchedulingDispatcher;
