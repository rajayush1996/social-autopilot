/**
 * Centralized configuration variables for the frontend.
 * Zero hardcoded configurations inside components.
 */
// Dynamic API URL: In browser, default to current origin
const getApiUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim() !== '') {
    const raw = process.env.NEXT_PUBLIC_API_URL.trim();
    return raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://140.245.202.135';
};

export const CONFIG = {
  API_URL: getApiUrl(),
  APP_NAME: 'OmniSync',
  APP_SUBTITLE: 'Social Copilot',
  POLLING_INTERVAL_MS: 15000, // 15 seconds credits refresh
};

export default CONFIG;
