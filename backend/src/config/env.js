import 'dotenv/config';

/**
 * Centralized Application Configuration & Environment Bootstrap.
 * Single source of truth for all environment variables, defaults, and API endpoints.
 */
export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl: process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000',
  frontendUrl: (process.env.FRONTEND_URL || (process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',')[0] : '') || 'http://localhost:3000').trim(),
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'info'),

  jwt: {
    secret: process.env.JWT_SECRET || 'super_secret_jwt_sign_key_for_social_autopilot',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'super_secret_jwt_refresh_key_for_social_autopilot',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '3m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '1d',
  },

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
    apiKey: process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY || process.env.OPENAI_KEY,
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
      scope: process.env.INSTAGRAM_SCOPE || 'instagram_basic,instagram_content_publish,pages_show_list,public_profile',
    },
    facebook: {
      graphBaseUrl: process.env.GRAPH_API_BASE_URL || 'https://graph.facebook.com/v19.0',
      appId: process.env.FACEBOOK_APP_ID,
      appSecret: process.env.FACEBOOK_APP_SECRET,
      scope: process.env.FACEBOOK_SCOPE || 'pages_manage_posts,pages_read_engagement,pages_show_list,public_profile',
    },
    linkedin: {
      apiBaseUrl: process.env.LINKEDIN_API_BASE_URL || 'https://api.linkedin.com/v2',
      oauthBaseUrl: process.env.LINKEDIN_OAUTH_BASE_URL || 'https://www.linkedin.com/oauth/v2',
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      scope: process.env.LINKEDIN_SCOPE || (process.env.LINKEDIN_ENABLE_ORGANIZATIONS === 'true' ? 'openid profile w_member_social w_organization_social r_organization_social' : 'openid profile w_member_social'),
      enableOrganizations: process.env.LINKEDIN_ENABLE_ORGANIZATIONS === 'true',
    },
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    simulationHostUrl: process.env.SIMULATION_UPLOAD_HOST_URL || 'https://res.cloudinary.com/simulated-cloud/image/upload',
  },
  r2: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME,
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || process.env.R2_ENDPOINT,
    publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_DOMAIN || process.env.R2_PUBLIC_URL,
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'info@omnisyncapp.com',
  },
};

export default config;
