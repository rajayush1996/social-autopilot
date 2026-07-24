export function padTwo(value: number) {
  return value.toString().padStart(2, '0');
}

export function formatDate(value: string | Date | undefined | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getUTCFullYear()}-${padTwo(date.getUTCMonth() + 1)}-${padTwo(date.getUTCDate())}`;
}

export function formatDateTime(value: string | Date | undefined | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getUTCFullYear()}-${padTwo(date.getUTCMonth() + 1)}-${padTwo(date.getUTCDate())} ${padTwo(date.getUTCHours())}:${padTwo(date.getUTCMinutes())}`;
}
