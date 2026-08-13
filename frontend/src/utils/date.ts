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
