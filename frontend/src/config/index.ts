/**
 * Centralized configuration variables for the frontend.
 * Zero hardcoded configurations inside components.
 */
export const CONFIG = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  APP_NAME: 'Autopilot',
  APP_SUBTITLE: 'Social Copilot',
  POLLING_INTERVAL_MS: 15000, // 15 seconds credits refresh
};

export default CONFIG;
