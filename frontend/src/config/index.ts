/**
 * Centralized configuration variables for the frontend.
 * Zero hardcoded configurations inside components.
 */
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const formattedApiUrl = rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://')
  ? rawApiUrl
  : `https://${rawApiUrl}`;

export const CONFIG = {
  API_URL: formattedApiUrl,
  APP_NAME: 'OmniSync',
  APP_SUBTITLE: 'Social Copilot',
  POLLING_INTERVAL_MS: 15000, // 15 seconds credits refresh
};

export default CONFIG;
