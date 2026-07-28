import 'dotenv/config';
import config from '../src/config/env.js';
import crypto from 'crypto';

function generateCorrectXAuthUrl() {
  const redirectUri = config.oauth.redirectUri || 'http://localhost:5000/api/auth/callback';
  const xClientId = config.social.x.clientId;
  
  const xCodeVerifier = crypto.randomBytes(32).toString('base64url');
  const xCodeChallenge = crypto
    .createHash('sha256')
    .update(xCodeVerifier)
    .digest('base64url');

  const xStatePayload = JSON.stringify({
    platform: 'X',
    userId: 'test-user-id',
    codeVerifier: xCodeVerifier,
    timestamp: Date.now(),
  });
  const xState = Buffer.from(xStatePayload).toString('base64url');

  const xScope = 'tweet.read%20tweet.write%20users.read%20offline.access';

  const url = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${xClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${xScope}&state=${xState}&code_challenge=${xCodeChallenge}&code_challenge_method=S256`;
  return { url };
}

console.log('--- Fixed X (Twitter) OAuth URL ---');
const data = generateCorrectXAuthUrl();
console.log(data.url);
