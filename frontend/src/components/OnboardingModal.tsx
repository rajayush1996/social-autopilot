'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Sparkles, 
  Check, 
  ArrowRight, 
  X, 
  Building2, 
  Compass, 
  Target, 
  Flame, 
  Layers,
  Edit3,
  RefreshCw
} from 'lucide-react';
import ApiService from '@/services/apiService';
import { useToast } from '@/context/ToastContext';

export interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (newBrandContext: string, newName?: string) => void;
  initialBrandContext?: string;
  initialName?: string;
}

export const PERSONAS = [
  { id: 'FOUNDER', label: 'Founder / Builder', icon: '👨‍💻', desc: 'Building software, startups, or digital products' },
  { id: 'CREATOR', label: 'Content Creator', icon: '🎨', desc: 'Growing an audience & sharing ideas' },
  { id: 'SPIRITUAL', label: 'Spiritual / Mindfulness Guide', icon: '🧘', desc: 'Sharing inner peace, meditation & sacred wisdom' },
  { id: 'FITNESS', label: 'Fitness & Wellness Coach', icon: '⚡', desc: 'Workouts, healthy habits & physical vitality' },
  { id: 'BUSINESS', label: 'Agency / Business Brand', icon: '💼', desc: 'B2B services, client growth & enterprise scale' },
  { id: 'PROFESSIONAL', label: 'Industry Thought Leader', icon: '👔', desc: 'Strategic insights, leadership & career advice' },
];

export const NICHES = [
  { id: 'TECH_SAAS', label: 'Tech & SaaS', icon: '🚀', defaultSnippet: 'SaaS automation workflows, tech innovations, developer tools, and product growth.' },
  { id: 'SPIRITUAL', label: 'Spiritual & Mindfulness', icon: '🕉️', defaultSnippet: 'Daily spiritual reflections, sacred mantra insights, meditation, and inner peace grounding.' },
  { id: 'FITNESS', label: 'Health & Fitness', icon: '⚡', defaultSnippet: 'Daily workout discipline, fitness habits, nutrition, and mental resilience.' },
  { id: 'BUSINESS', label: 'Business & Startups', icon: '💼', defaultSnippet: 'Business growth, founder lessons, customer problem-solving, and market strategies.' },
  { id: 'EDUCATION', label: 'Education & Career', icon: '📚', defaultSnippet: 'Career roadmaps, professional skill development, practical advice, and interview frameworks.' },
  { id: 'DESIGN', label: 'Design & Creative', icon: '🎨', defaultSnippet: 'UI/UX design, visual storytelling, creative aesthetics, and design thinking principles.' },
  { id: 'COMMERCE', label: 'E-Commerce & Retail', icon: '🛍️', defaultSnippet: 'D2C brand building, customer experience, product launches, and retail trends.' },
  { id: 'CUSTOM', label: 'Custom Field', icon: '✍️', defaultSnippet: 'Specialized niche insights and community-focused value.' },
];

export const INTENTS = [
  { id: 'VIRAL', label: 'High Virality & Growth', icon: '📈', desc: 'Scroll-stopping hooks, relatable hot takes, and comment engagement' },
  { id: 'AUTHORITY', label: 'Deep Authority & Teardowns', icon: '🎯', desc: 'Forensic breakdowns, metrics, frameworks, and actionable case studies' },
  { id: 'INSPIRATIONAL', label: 'Mindful & Heartfelt Reflection', icon: '🙏', desc: 'Soulful wisdom, peace, gratitude, and transformational inspiration' },
  { id: 'ACTIONABLE', label: 'Actionable Step-by-Step Guides', icon: '💡', desc: 'Practical checklists, how-to blueprints, and implementation tips' },
];

export function buildBrandVoiceNarrative(personaId: string, nicheId: string, intentId: string, brandName: string): string {
  const niche = NICHES.find(n => n.id === nicheId) || NICHES[0];
  const intent = INTENTS.find(i => i.id === intentId) || INTENTS[0];
  const nameLabel = brandName ? `For "${brandName}": ` : '';

  if (nicheId === 'SPIRITUAL') {
    return `${nameLabel}Heartfelt spiritual reflections, sacred mantras, meditation wisdom, and inner peace grounding. We connect seekers with tranquility and resilience amidst the chaos of daily life. Tone is warm, reverent, peaceful, and universally inspiring.`;
  }
  if (nicheId === 'FITNESS') {
    return `${nameLabel}Actionable fitness routines, daily habit discipline, nutrition principles, and mental toughness. We empower health enthusiasts to stay consistent and energized. Tone is high-energy, motivating, and practical.`;
  }
  if (nicheId === 'TECH_SAAS') {
    return `${nameLabel}Modern software workflows, developer productivity, product teardowns, and engineering best practices. We help tech builders eliminate bottlenecks and build high-scale solutions. Tone is authoritative, insightful, and clear.`;
  }
  if (nicheId === 'BUSINESS') {
    return `${nameLabel}Real-world business strategies, founder playbooks, customer friction solving, and sustainable revenue growth. Tone is strategic, data-driven, and actionable.`;
  }

  return `${nameLabel}${niche.defaultSnippet} Focused on ${intent.desc.toLowerCase()}. Tone is authentic, high-signal, and value-packed.`;
}

export default function OnboardingModal({
  isOpen,
  onClose,
  onSaved,
  initialBrandContext = '',
  initialName = '',
}: OnboardingModalProps) {
  const [selectedPersona, setSelectedPersona] = useState('FOUNDER');
  const [selectedNiche, setSelectedNiche] = useState('TECH_SAAS');
  const [selectedIntent, setSelectedIntent] = useState('VIRAL');
  const [brandName, setBrandName] = useState(initialName);
  const [customContext, setCustomContext] = useState(initialBrandContext);
  const [isEditingManually, setIsEditingManually] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  // On initial mount or open, auto-derive or keep existing
  useEffect(() => {
    if (initialBrandContext && initialBrandContext.trim()) {
      setCustomContext(initialBrandContext);
      setIsEditingManually(true);
      // Attempt heuristic selection
      if (/shiva|mahadev|spiritual|om|mantra|peace|meditat/i.test(initialBrandContext)) {
        setSelectedNiche('SPIRITUAL');
        setSelectedPersona('SPIRITUAL');
        setSelectedIntent('INSPIRATIONAL');
      } else if (/fitness|workout|gym|health/i.test(initialBrandContext)) {
        setSelectedNiche('FITNESS');
        setSelectedPersona('FITNESS');
      } else if (/saas|software|tech|developer|code/i.test(initialBrandContext)) {
        setSelectedNiche('TECH_SAAS');
      }
    } else {
      const generated = buildBrandVoiceNarrative(selectedPersona, selectedNiche, selectedIntent, brandName);
      setCustomContext(generated);
    }
  }, [isOpen]);

  const handlePersonaChange = (pId: string) => {
    setSelectedPersona(pId);
    if (!isEditingManually) {
      setCustomContext(buildBrandVoiceNarrative(pId, selectedNiche, selectedIntent, brandName));
    }
  };

  const handleNicheChange = (nId: string) => {
    setSelectedNiche(nId);
    if (!isEditingManually) {
      setCustomContext(buildBrandVoiceNarrative(selectedPersona, nId, selectedIntent, brandName));
    }
  };

  const handleIntentChange = (iId: string) => {
    setSelectedIntent(iId);
    if (!isEditingManually) {
      setCustomContext(buildBrandVoiceNarrative(selectedPersona, selectedNiche, iId, brandName));
    }
  };

  const handleRegenerateVoice = () => {
    const generated = buildBrandVoiceNarrative(selectedPersona, selectedNiche, selectedIntent, brandName);
    setCustomContext(generated);
    setIsEditingManually(false);
    toast.info('Regenerated brand voice draft based on selected chips!');
  };

  const handleSave = async () => {
    if (!customContext.trim()) {
      toast.error('Please select a niche or enter a brief brand context.');
      return;
    }

    setSaving(true);
    try {
      // 1. Save brand context & autopilot settings
      await ApiService.updateAutopilotSettings({
        userId: 'me',
        brandContext: customContext.trim(),
      });

      // 2. Save brand name if provided
      if (brandName && brandName.trim()) {
        await ApiService.updateUserProfile({
          name: brandName.trim(),
        }).catch(() => {});
      }

      localStorage.setItem('onboarding_completed', 'true');
      toast.success('🎉 Brand Voice & Niche configured successfully!');
      onSaved(customContext.trim(), brandName.trim());
      onClose();
    } catch (err: any) {
      console.error('Failed to save onboarding settings:', err);
      toast.error(err.response?.data?.message || 'Failed to save setup. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div 
        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-scaleUp transition-all relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-[var(--border-color)] flex items-start justify-between gap-4 bg-gradient-to-r from-[#2563EB]/10 via-transparent to-purple-500/10 shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2563EB]/15 border border-[#2563EB]/30 text-[#2563EB] dark:text-[#60A5FA] text-[11px] font-extrabold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Brand Voice & Niche Setup
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
              Tailor Your Brand Voice & Niche
            </h2>
            <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
              Select your field and intent so the AI generates 100% relevant posts tailored to your domain. You can change this anytime later in Settings.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-all cursor-pointer"
            title="Skip for now"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          
          {/* Brand / Creator Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#2563EB]" /> Brand / Creator / Page Name (Optional)
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Ayush Raj, Mindful Mornings, OmniSync, FitPulse..."
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          {/* Step 1: Persona Role */}
          <div className="space-y-2">
            <label className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#2563EB]" /> 1. What best describes your identity?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PERSONAS.map((p) => {
                const isSelected = selectedPersona === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePersonaChange(p.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 relative ${
                      isSelected
                        ? 'bg-[#2563EB]/15 border-[#2563EB] shadow-xs text-[#2563EB] dark:text-[#60A5FA]'
                        : 'bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--border-color)]/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg">{p.icon}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#2563EB]" />}
                    </div>
                    <span className="font-extrabold text-xs">{p.label}</span>
                    <span className="text-[10px] text-[var(--text-secondary)] line-clamp-1">{p.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Primary Field / Niche */}
          <div className="space-y-2">
            <label className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#2563EB]" /> 2. Which field or industry do you belong to?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {NICHES.map((n) => {
                const isSelected = selectedNiche === n.id;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleNicheChange(n.id)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#2563EB]/15 border-[#2563EB] font-black text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
                        : 'bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold'
                    }`}
                  >
                    <span className="text-xl">{n.icon}</span>
                    <span className="text-[11px] leading-tight">{n.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Content Intent & Goals */}
          <div className="space-y-2">
            <label className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-[#2563EB]" /> 3. Primary Content Intent & Style
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {INTENTS.map((intent) => {
                const isSelected = selectedIntent === intent.id;
                return (
                  <button
                    key={intent.id}
                    type="button"
                    onClick={() => handleIntentChange(intent.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-[#2563EB]/15 border-[#2563EB] shadow-xs text-[#2563EB] dark:text-[#60A5FA]'
                        : 'bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="text-lg mt-0.5">{intent.icon}</span>
                    <div className="space-y-0.5">
                      <span className="font-extrabold text-xs block">{intent.label}</span>
                      <span className="text-[10px] text-[var(--text-secondary)] leading-tight block">{intent.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Editable Brand Voice Context Preview */}
          <div className="space-y-2 bg-[var(--bg-input)]/80 border border-[var(--border-color)] p-4 rounded-2xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-[11px] font-extrabold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-[#2563EB]" /> Generated Brand Voice & Demographics (Editable)
              </label>
              <button
                type="button"
                onClick={handleRegenerateVoice}
                className="text-[10px] font-bold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Reset to chip template
              </button>
            </div>
            <textarea
              value={customContext}
              onChange={(e) => {
                setCustomContext(e.target.value);
                setIsEditingManually(true);
              }}
              rows={3}
              placeholder="Edit or describe your brand voice, offerings, or topics freely..."
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#2563EB] leading-relaxed font-sans"
            />
            <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
              💡 The AI Engine uses this to understand your background and formulate daily relevant posts. You can edit this anytime in Settings.
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold text-xs transition-all cursor-pointer"
          >
            Skip for Now
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold rounded-xl px-5 py-2.5 transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{saving ? 'Saving Voice Profile...' : 'Save & Apply Brand Voice'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
