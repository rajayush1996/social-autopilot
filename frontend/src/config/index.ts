/**
 * Centralized configuration variables for the frontend.
 * Zero hardcoded configurations inside components.
 */
// Dynamic API URL: In localhost development, route to backend port 5000; in production use origin
const getApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    }
    return process.env.NEXT_PUBLIC_API_URL || window.location.origin || '';
  }
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim() !== '') {
    const raw = process.env.NEXT_PUBLIC_API_URL.replace(/['",]/g, '').trim();
    return raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
  }
  return process.env.INTERNAL_API_URL || 'http://127.0.0.1:5000';
};

export const CONFIG = {
  API_URL: getApiUrl(),
  APP_NAME: 'OmniSync',
  APP_SUBTITLE: 'Social Copilot',
  POLLING_INTERVAL_MS: 15000, // 15 seconds credits refresh
};

export default CONFIG;
