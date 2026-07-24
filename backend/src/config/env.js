import 'dotenv/config';

/**
 * Centralized Application Configuration & Environment Bootstrap.
 * Single source of truth for all environment variables, defaults, and API endpoints.
 */
export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  logLevel: process.env.LOG_LEVEL || 'info',

  db: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    baseUrl: process.env.OPENAI_BASE_URL,
  },

  oauth: {
    redirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:5000/api/auth/callback',
  },

  social: {
    x: {
      baseUrl: process.env.X_API_BASE_URL || 'https://api.twitter.com/2',
      clientId: process.env.X_CLIENT_ID,
      clientSecret: process.env.X_CLIENT_SECRET,
    },
    instagram: {
      graphBaseUrl: process.env.GRAPH_API_BASE_URL || 'https://graph.facebook.com/v19.0',
      apiBaseUrl: process.env.INSTAGRAM_API_BASE_URL || 'https://graph.instagram.com',
      appId: process.env.FACEBOOK_APP_ID,
      appSecret: process.env.FACEBOOK_APP_SECRET,
    },
    linkedin: {
      apiBaseUrl: process.env.LINKEDIN_API_BASE_URL || 'https://api.linkedin.com/v2',
      oauthBaseUrl: process.env.LINKEDIN_OAUTH_BASE_URL || 'https://www.linkedin.com/oauth/v2',
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      scope: process.env.LINKEDIN_SCOPE || 'openid profile w_member_social',
    },
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    simulationHostUrl: process.env.SIMULATION_UPLOAD_HOST_URL || 'https://res.cloudinary.com/simulated-cloud/image/upload',
  },
};

export default config;
