export function padTwo(value: number) {
  return value.toString().padStart(2, '0');
}

/**
 * Formats date string or Date object into local YYYY-MM-DD based on user's browser timezone.
 */
export function formatDate(value: string | Date | undefined | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`;
}

/**
 * Formats datetime into local YYYY-MM-DD HH:mm based on user's browser timezone.
 */
export function formatDateTime(value: string | Date | undefined | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())} ${padTwo(date.getHours())}:${padTwo(date.getMinutes())}`;
}

/**
 * Formats datetime into a human-friendly localized string (e.g. "Aug 13, 2026, 8:00 PM").
 */
export function formatDateTimeFriendly(value: string | Date | undefined | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats time string (e.g. "20:00") into 12-hour AM/PM format (e.g. "08:00 PM").
 */
export function formatTimeDisplay(timeStr: string | undefined | null): string {
  if (!timeStr) return '09:00 AM';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export interface ReviewPipelineInfo {
  isOvernight: boolean;
  reviewWindowText: string;
  badgeLabel: string;
  badgeColorClass: string;
  headline: string;
  draftTimeDisplay: string;
  publishTimeDisplay: string;
  summaryText: string;
}

/**
 * Calculates the exact workflow narrative based on draft time vs publishing time.
 * Distinguishes Same-Day vs Overnight (Evening Before ➔ Next Morning) pipelines.
 */
export function getReviewPipelineNarrative(
  draftTimeStr: string | undefined | null,
  publishTimeStr: string | undefined | null
): ReviewPipelineInfo {
  const [dhStr, dmStr] = (draftTimeStr || '09:00').split(':');
  const [phStr, pmStr] = (publishTimeStr || '20:00').split(':');

  const draftH = parseInt(dhStr, 10) || 0;
  const draftM = parseInt(dmStr, 10) || 0;
  const pubH = parseInt(phStr, 10) || 0;
  const pubM = parseInt(pmStr, 10) || 0;

  const draftTotal = draftH * 60 + draftM;
  const pubTotal = pubH * 60 + pubM;

  const draftFormatted = formatTimeDisplay(draftTimeStr || '09:00');
  const pubFormatted = formatTimeDisplay(publishTimeStr || '20:00');

  if (draftTotal === pubTotal) {
    return {
      isOvernight: false,
      reviewWindowText: 'Instant Dispatch',
      badgeLabel: '⚡ Direct Dispatch',
      badgeColorClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:text-emerald-400',
      headline: 'Direct Generation & Instant Dispatch',
      draftTimeDisplay: draftFormatted,
      publishTimeDisplay: pubFormatted,
      summaryText: `AI content generates at ${draftFormatted} and automatically dispatches live to your connected channels at the same time.`,
    };
  }

  if (draftTotal < pubTotal) {
    // Same-Day Pipeline
    const diffMins = pubTotal - draftTotal;
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    const windowStr = mins > 0 ? `${hrs}h ${mins}m` : `${hrs} Hours`;

    return {
      isOvernight: false,
      reviewWindowText: windowStr,
      badgeLabel: `🌅 Same-Day Dispatch (${windowStr} Window)`,
      badgeColorClass: 'bg-blue-500/10 text-blue-700 border-blue-300 dark:text-blue-300',
      headline: 'Same-Day Review & Publishing Pipeline',
      draftTimeDisplay: draftFormatted,
      publishTimeDisplay: pubFormatted,
      summaryText: `AI draft generated at ${draftFormatted} ➔ Review & approve via email or web before auto-dispatch at ${pubFormatted} (Same-Day ${windowStr} review window).`,
    };
  }

  // Overnight Pipeline (e.g. 23:00 / 11:00 PM draft -> 09:00 AM next day publish)
  const diffMins = (24 * 60 - draftTotal) + pubTotal;
  const hrs = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  const windowStr = mins > 0 ? `${hrs}h ${mins}m` : `${hrs} Hours`;

  return {
    isOvernight: true,
    reviewWindowText: windowStr,
    badgeLabel: `🌙 Overnight Prep ➔ Next-Day Live (${windowStr} Window)`,
    badgeColorClass: 'bg-indigo-500/10 text-indigo-700 border-indigo-300 dark:text-indigo-300',
    headline: 'Overnight Review Pipeline (Prepares Evening Before)',
    draftTimeDisplay: draftFormatted,
    publishTimeDisplay: pubFormatted,
    summaryText: `AI draft generated the evening before at ${draftFormatted} ➔ Review & approve via email or web before live auto-dispatch next morning at ${pubFormatted} (Next Day) (${windowStr} overnight review window).`,
  };
}
