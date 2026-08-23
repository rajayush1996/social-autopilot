'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  User, 
  ChevronDown, 
  Check, 
  AlertCircle, 
  Info,
  CheckCircle2
} from 'lucide-react';
import { PlatformIcon, type PlatformDefinition } from '@/config/platforms';
import type { PlatformKey } from '@/constants/platforms';
import { SocialAccount } from '@/lib/api';

interface ChannelTargetChipsProps {
  selectablePlatforms: PlatformDefinition[];
  connectedPlatforms: string[];
  connectedAccounts: SocialAccount[];
  selectedPlatforms: PlatformKey[];
  selectedAccountIds: string[];
  onTogglePlatform: (platformId: PlatformKey) => void;
  onToggleAccount: (accountId: string, platformId: PlatformKey) => void;
  className?: string;
}

export default function ChannelTargetChips({
  selectablePlatforms,
  connectedPlatforms,
  connectedAccounts,
  selectedPlatforms,
  selectedAccountIds,
  onTogglePlatform,
  onToggleAccount,
  className = '',
}: ChannelTargetChipsProps) {
  const [openDropdownPlatform, setOpenDropdownPlatform] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownPlatform(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if any active platform has 0 targets selected
  const hasZeroSelectedActivePlatform = selectedPlatforms.some((p) => {
    const accountsForP = connectedAccounts.filter(
      (acc) => acc.platform?.toUpperCase() === p.toUpperCase()
    );
    if (accountsForP.length > 1) {
      const selectedCount = accountsForP.filter((acc) => selectedAccountIds.includes(acc.id)).length;
      return selectedCount === 0;
    }
    return false;
  });

  return (
    <div className={`space-y-3 relative ${className}`} ref={dropdownRef}>
      <div className="flex flex-wrap gap-2.5 items-center">
        {selectablePlatforms.map((platform) => {
          const isConnected = connectedPlatforms.includes(platform.id);
          const platformUpper = platform.id as PlatformKey;
          const isActive = selectedPlatforms.includes(platformUpper) && isConnected;

          // All connected accounts/pages for this platform
          const accountsForPlatform = connectedAccounts.filter(
            (acc) => acc.platform?.toUpperCase() === platform.id.toUpperCase()
          );
          const hasMultiple = accountsForPlatform.length > 1;

          // Count selected accounts for this platform
          const selectedInPlatform = accountsForPlatform.filter((acc) =>
            selectedAccountIds.includes(acc.id)
          );
          const selectedCount = selectedInPlatform.length;
          const hasZeroSelection = isActive && hasMultiple && selectedCount === 0;

          const isDropdownOpen = openDropdownPlatform === platform.id;

          return (
            <div key={platform.id} className="relative">
              {/* Channel Chip with Solid Status Dot Indicator */}
              <button
                type="button"
                onClick={() => {
                  if (!isConnected) {
                    onTogglePlatform(platformUpper);
                    return;
                  }
                  if (hasMultiple) {
                    // Open/close destination dropdown popover
                    setOpenDropdownPlatform(isDropdownOpen ? null : platform.id);
                    if (!selectedPlatforms.includes(platformUpper)) {
                      onTogglePlatform(platformUpper);
                    }
                  } else {
                    onTogglePlatform(platformUpper);
                  }
                }}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none ${
                  hasZeroSelection
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-600 dark:text-amber-400 shadow-sm'
                    : isActive
                    ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-md shadow-blue-500/20'
                    : 'bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-[#2563EB]/50 hover:bg-[var(--bg-card)]'
                }`}
                title={
                  isConnected
                    ? `${platform.label} is Connected`
                    : `${platform.label} is Offline. Click to connect.`
                }
              >
                {/* Solid Status Indicator (Green = Active/Connected, Red = Offline) */}
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isConnected
                      ? isActive
                        ? 'bg-emerald-300 animate-pulse'
                        : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                      : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                  }`}
                />

                {/* Channel Icon & Label */}
                <div className="flex items-center gap-1.5 border-r border-current pr-2 pb-0.5 pt-0.5 border-opacity-20">
                  <PlatformIcon platform={platform.id} className="w-4 h-4" />
                  <span>{platform.label}</span>
                  {hasMultiple && (
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </div>

                {/* Status Badge: Active / Offline / X Selected */}
                <span
                  className={`text-[10px] px-1 rounded font-extrabold uppercase tracking-widest ${
                    hasZeroSelection
                      ? 'text-amber-500'
                      : isActive
                      ? 'text-blue-100'
                      : isConnected
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {hasZeroSelection
                    ? '0 Selected'
                    : hasMultiple && isActive
                    ? `${selectedCount} Selected`
                    : isConnected
                    ? 'Active'
                    : 'Offline'}
                </span>
              </button>

              {/* Multi-Account / Company Page Dropdown Popover */}
              {hasMultiple && isDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 z-50 w-72 p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl backdrop-blur-2xl space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2 px-1">
                    <span className="text-xs font-black text-[var(--text-primary)] flex items-center gap-1.5">
                      <PlatformIcon platform={platform.id} className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>{platform.label} Destinations</span>
                    </span>
                    <span className="text-[11px] font-bold text-[#2563EB] dark:text-[#60A5FA]">
                      {selectedCount} of {accountsForPlatform.length} selected
                    </span>
                  </div>

                  {/* List of Personal Profiles & Company Pages */}
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
                    {accountsForPlatform.map((acc) => {
                      const isChecked = selectedAccountIds.includes(acc.id);
                      const isOrg = acc.accountType === 'ORGANIZATION';

                      return (
                        <label
                          key={acc.id}
                          className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-[#2563EB]/10 border-[#2563EB]/40 text-[var(--text-primary)] font-bold'
                              : 'bg-[var(--bg-input)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[#2563EB]/30'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                isChecked
                                  ? 'bg-[#2563EB] border-[#2563EB] text-white'
                                  : 'border-[var(--border-color)] bg-[var(--bg-card)]'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>

                            <div className="truncate">
                              <div className="truncate text-xs font-bold text-[var(--text-primary)]">
                                {acc.accountName || acc.username}
                              </div>
                              <div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1 font-medium">
                                {isOrg ? (
                                  <>
                                    <Building2 className="w-3 h-3 text-indigo-500 shrink-0" />
                                    <span>Company Page</span>
                                  </>
                                ) : (
                                  <>
                                    <User className="w-3 h-3 text-emerald-500 shrink-0" />
                                    <span>Personal Profile</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <input
                            type="checkbox"
                            className="hidden"
                            checked={isChecked}
                            onChange={() => onToggleAccount(acc.id, platformUpper)}
                          />
                        </label>
                      );
                    })}
                  </div>

                  {/* Quick Select All Button */}
                  <div className="pt-1 flex items-center justify-between text-[11px] px-1 text-[var(--text-secondary)]">
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = accountsForPlatform.map((a) => a.id);
                        const allSelected = allIds.every((id) => selectedAccountIds.includes(id));
                        allIds.forEach((id) => {
                          if (allSelected) {
                            if (selectedAccountIds.includes(id)) {
                              onToggleAccount(id, platformUpper);
                            }
                          } else {
                            if (!selectedAccountIds.includes(id)) {
                              onToggleAccount(id, platformUpper);
                            }
                          }
                        });
                      }}
                      className="text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline cursor-pointer"
                    >
                      {accountsForPlatform.every((a) => selectedAccountIds.includes(a.id))
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenDropdownPlatform(null)}
                      className="font-bold text-[var(--text-primary)] hover:text-[#2563EB] cursor-pointer"
                    >
                      Done ✓
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Zero Selection Notice Banner (Direct Warning if active channel has 0 targets selected) */}
      {hasZeroSelectedActivePlatform && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
          <span>
            <strong>Destination Notice:</strong> Please click the channel dropdown ▾ above and select at least one account or company page to publish.
          </span>
        </div>
      )}
    </div>
  );
}
