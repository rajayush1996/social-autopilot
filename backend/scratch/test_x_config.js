import 'dotenv/config';
import config from '../src/config/env.js';
import defaultXAdapter from '../src/services/social/xService.js';

console.log('--- Testing X (Twitter) Configuration Setup ---');
console.log('X Client ID Present:', Boolean(config.social.x.clientId));
console.log('X Client ID Preview:', config.social.x.clientId ? `${config.social.x.clientId.substring(0, 10)}...` : 'MISSING');
console.log('X Client Secret Present:', Boolean(config.social.x.clientSecret));
console.log('X Base URL:', config.social.x.baseUrl);

if (config.social.x.clientId && config.social.x.clientSecret) {
  console.log('\n✅ X (Twitter) API Keys loaded successfully! Real OAuth 2.0 connection is READY to connect.');
} else {
  console.error('\n❌ X Credentials missing in .env file!');
}
